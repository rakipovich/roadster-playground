"""Build gameplay-only GLBs with a frozen initial pose and small embedded textures.
Original experience assets are never modified. KTX2 detail images load separately.
Usage: python3 scripts/prepare-streaming.py /absolute/path/to/toktx
"""
import io,json,struct,sys,subprocess,hashlib
from pathlib import Path
from PIL import Image
BASE=Path(__file__).resolve().parents[1]/'public'; OUT=BASE/'streaming'; OUT.mkdir(exist_ok=True)
ENC=sys.argv[1]
def build(source,name):
 data=source.read_bytes(); n=struct.unpack_from('<I',data,12)[0]; j=json.loads(data[20:20+n]); binary=data[28+n:]; views=j['bufferViews']; payload={i:binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']] for i,v in enumerate(views)}
 access=j.get('accessors',[]); removed=set()
 # Bake the first key of each animation channel before discarding animation data.
 for anim in j.get('animations',[]):
  for channel in anim['channels']:
   s=anim['samplers'][channel['sampler']]; a=access[s['output']]; node=j['nodes'][channel['target']['node']]; path=channel['target']['path']; count={'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']]
   assert a['componentType']==5126 and 'sparse' not in a
   offset=a.get('byteOffset',0)+(count*4 if s.get('interpolation')=='CUBICSPLINE' else 0)
   if path=='weights':count=len(j['meshes'][node['mesh']]['primitives'][0].get('targets',[]))
   node[path]=list(struct.unpack_from('<'+'f'*count,payload[a['bufferView']],offset));node.pop('matrix',None)
  for s in anim['samplers']:removed.update([s['input'],s['output']])
 # Only keep accessors used by meshes or skins; animation-only views can then vanish.
 used=set()
 for m in j.get('meshes',[]):
  for p in m['primitives']:
   used.update(p['attributes'].values());used.update([p['indices']] if 'indices'in p else [])
   for t in p.get('targets',[]):used.update(t.values())
 for skin in j.get('skins',[]):
  if 'inverseBindMatrices'in skin:used.add(skin['inverseBindMatrices'])
 mapping={old:new for new,old in enumerate(sorted(used))};j['accessors']=[access[i] for i in sorted(used)]
 for m in j.get('meshes',[]):
  for p in m['primitives']:
   p['attributes']={k:mapping[v] for k,v in p['attributes'].items()}
   if 'indices'in p:p['indices']=mapping[p['indices']]
   for t in p.get('targets',[]):
    for k in t:t[k]=mapping[t[k]]
 for skin in j.get('skins',[]):
  if 'inverseBindMatrices'in skin:skin['inverseBindMatrices']=mapping[skin['inverseBindMatrices']]
 j.pop('animations',None)
 color_images=set();normal_images=set()
 def texture_roles(o):
  if isinstance(o,dict):
   for key,value in o.items():
    if key.endswith('Texture') and isinstance(value,dict) and 'index' in value:
     t=j['textures'][value['index']];imidx=t.get('source',t.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))
     if key in ['baseColorTexture','emissiveTexture','specularColorTexture','sheenColorTexture']:color_images.add(imidx)
     if key in ['normalTexture','clearcoatNormalTexture']:normal_images.add(imidx)
    else:texture_roles(value)
  elif isinstance(o,list):
   for v in o:texture_roles(v)
 texture_roles(j.get('materials',[]))
 details=[]
 for i,image in enumerate(j.get('images',[])):
  vi=image['bufferView']; original=payload[vi]; im=Image.open(io.BytesIO(original)).convert('RGBA'); title=image.get('name',''); linear=i not in color_images
  low=im.copy();low.thumbnail((256,256),Image.Resampling.LANCZOS);buf=io.BytesIO();low.save(buf,format='WEBP',quality=80);payload[vi]=buf.getvalue();image['mimeType']='image/webp'
  limit=512 if name=='game' and i in normal_images and 'head' not in title.lower() else 1024
  full=im.copy();full.thumbnail((limit,limit),Image.Resampling.LANCZOS)
  aligned=full.width%4 or full.height%4
  if aligned:full=full.resize(((full.width+3)//4*4,(full.height+3)//4*4),Image.Resampling.LANCZOS)
  mode='uastc' if i in normal_images or 'opacity' in title.lower() else 'etc1s'
  digest=hashlib.sha256(original+b'ktx-progressive-v2'+str((linear,limit,mode)).encode()+(b'aligned' if aligned else b'')).hexdigest()[:16]; filename=f'{digest}.ktx2';target=OUT/filename
  if not target.exists():
   png=OUT/f'{digest}.png';full.save(png)
   subprocess.run([ENC,'--t2','--encode',mode]+(['--uastc_quality','2','--zcmp','18'] if mode=='uastc' else ['--qlevel','192','--clevel','1'])+['--genmipmap','--threads','2','--assign_oetf','linear' if linear else 'srgb',str(target),str(png)],check=True,stdout=subprocess.DEVNULL)
   png.unlink()
  details.append({'image':i,'file':filename,'name':title,'bytes':target.stat().st_size})
 # All low textures are WebP, whether the original used a standard or WebP source.
 for t in j.get('textures',[]):
  src=t.get('source',t.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))
  t.pop('source',None);t.setdefault('extensions',{})['EXT_texture_webp']={'source':src}
 for key in ['extensionsUsed','extensionsRequired']:
  if 'EXT_texture_webp' not in j.setdefault(key,[]):j[key].append('EXT_texture_webp')
 # Generic buffer-view reference walk includes Draco data and sparse accessor data.
 refs=set()
 def walk(o,replace=None):
  if isinstance(o,dict):
   for k,v in o.items():
    if k=='bufferView':
     if replace is None:refs.add(v)
     else:o[k]=replace[v]
    else:walk(v,replace)
  elif isinstance(o,list):
   for v in o:walk(v,replace)
 walk({k:v for k,v in j.items() if k!='bufferViews'})
 remap={v:i for i,v in enumerate(sorted(refs))};packed=bytearray();newviews=[]
 for vi in sorted(refs):
  packed.extend(b'\0'*((-len(packed))%4));v=dict(views[vi]);v.update(buffer=0,byteOffset=len(packed),byteLength=len(payload[vi]));newviews.append(v);packed.extend(payload[vi])
 walk(j,remap);j['bufferViews']=newviews;j['buffers']=[{'byteLength':len(packed)}]
 raw=json.dumps(j,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4);packed+=b'\0'*((-len(packed))%4)
 out=struct.pack('<III',0x46546c67,2,28+len(raw)+len(packed))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(packed),0x004e4942)+packed
 (OUT/f'{name}.glb').write_bytes(out)
 manifest={'textures':details,'sources':[t['extensions']['EXT_texture_webp']['source'] for t in j.get('textures',[])]};(OUT/f'{name}.json').write_text(json.dumps(manifest))
 print(name,'base MB',round(len(out)/1e6,2),'detail MB',round(sum(t['bytes'] for t in details)/1e6,2),flush=True)
 return len(out)
a=build(BASE/'assets/environment.glb','environment');b=build(BASE/'models/ride.glb','game')
(OUT/'loading-manifest.json').write_text(json.dumps({'files':[{'role':'environment','bytes':a},{'role':'ride','bytes':b}]}))

used={x['file'] for n in ['game','environment'] for x in json.loads((OUT/f'{n}.json').read_text())['textures']}
for p in OUT.glob('*.ktx2'):
 if p.name not in used:p.unlink()
