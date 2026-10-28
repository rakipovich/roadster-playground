// Independent ownership: releasing/cancelling one finger never releases another.
export function heldPointers(){
 const pointers=new Map();
 return {
  begin(id,action){pointers.set(id,{action,origin:action});},
  move(id,action){const p=pointers.get(id);if(p)p.action=action;},
  end(id){pointers.delete(id);},clear(){pointers.clear();},
  has(action){return [...pointers.values()].some(p=>p.action===action||(action==='gas'&&p.origin==='gas'&&['boost','grip'].includes(p.action)));},
  action(id){return pointers.get(id)?.action;},
  owns(id){return pointers.has(id);},
 };
}
