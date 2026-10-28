// Night sky adapted from RDSTR Stunts, MIT: /licenses/rdstr.txt.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createAsphaltTextures} from './rdstr-asphalt.ts';
export function createSky() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(0x040508) },
      uHaze: { value: new THREE.Color(0x111620) },
      uHorizon: { value: new THREE.Color(0x07080c) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; // pin to the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHaze;
      uniform vec3 uHorizon;
      varying vec3 vDir;
      void main() {
        float h = normalize(vDir).y;
        // Haze band peaks a few degrees above the horizon, fades to the zenith.
        float band = exp(-max(h - 0.02, 0.0) * 9.0);
        vec3 c = mix(uTop, uHaze, band);
        c = mix(c, uHorizon, smoothstep(0.03, -0.01, h));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1400, 32, 16),
    material
  );
  mesh.name = "sky";
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}


export function nightVenue(scene,environment,renderer,{mobile=false}={}){
 scene.background=new THREE.Color('#040508');
 scene.fog=new THREE.FogExp2('#10151f',.0018);
 scene.add(createSky());
 environment.traverse(o=>{if(o.isMesh&&o.name==='Asphalt_test_pad')o.visible=false;if(o.isMesh&&o.name.includes('Asphalt'))o.visible=false;});
 const geometry=new THREE.PlaneGeometry(320,320);geometry.rotateX(-Math.PI/2);
 const uv=geometry.attributes.uv,pos=geometry.attributes.position;
 for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/7,-pos.getZ(i)/7);
 const material=new THREE.MeshStandardMaterial({color:'#353941',roughness:1,metalness:0,envMapIntensity:.12});
 const ground=new THREE.Mesh(geometry,material);ground.position.y=-.01;ground.name='Night asphalt';scene.add(ground);
 const generator=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 const target=generator.fromScene(room,.04);scene.environment=target.texture;scene.environmentIntensity=.35;
 room.dispose();generator.dispose();renderer.toneMappingExposure=1.05;
 return {improve(){const maps=createAsphaltTextures(mobile?'low':'high');material.map=maps.map;material.roughnessMap=maps.roughnessMap;material.normalMap=maps.normalMap;material.normalScale.set(.3,.3);material.needsUpdate=true;},ground};
}
