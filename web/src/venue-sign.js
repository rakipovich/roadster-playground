import * as T from 'three';
// Painted wordmark, generated once; no downloaded image, light or animation.
export function venueSign(scene){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#bcc0c6';ctx.textAlign='center';ctx.font='500 72px Arial';ctx.fillText('T E S L A',256,76);ctx.fillStyle='#a3333e';ctx.fillRect(98,102,316,4);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const mesh=new T.Mesh(new T.PlaneGeometry(15,3.75),new T.MeshLambertMaterial({map:texture,alphaTest:.3,side:T.DoubleSide,depthWrite:true}));mesh.position.set(72.975,51,90);mesh.rotation.y=-Math.PI/2;mesh.name='Tower painted Tesla wordmark';mesh.updateMatrix();mesh.matrixAutoUpdate=false;scene.add(mesh);
}

export function venueLogos(scene){
 const loader=new T.TextureLoader(),base=import.meta.env.BASE_URL;
 function install(file,placements){loader.load(base+'assets/'+file,texture=>{
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;
  const material=new T.MeshLambertMaterial({map:texture,color:'#aeb3bb',alphaTest:.35,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  for(const {p,size,rx=0,ry=0}of placements){const mesh=new T.Mesh(new T.PlaneGeometry(size,size),material);mesh.position.set(...p);mesh.rotation.set(rx,ry,0);mesh.name='Painted '+file;mesh.updateMatrix();mesh.matrixAutoUpdate=false;scene.add(mesh);}
 });}
 install('tesla-symbol.svg',[{p:[72.97,45,90],size:6,ry:-Math.PI/2},{p:[28,2.025,22],size:4,rx:-Math.PI/2}]);
 install('r-decal.png',[{p:[85,60.13,90],size:7,rx:-Math.PI/2},{p:[-10,11,-89.96],size:5},{p:[-20,.025,-24],size:3.2,rx:-Math.PI/2}]);
}
