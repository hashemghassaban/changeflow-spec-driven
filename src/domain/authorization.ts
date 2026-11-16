export type Role='Requester'|'Reviewer';
export function hasRole(roles:ReadonlySet<Role>,role:Role):boolean{return roles.has(role);}
export function isOwner(requesterId:string,userId:string):boolean{return requesterId===userId;}
export function canRead(roles:ReadonlySet<Role>,requesterId:string,userId:string):boolean{return roles.has('Reviewer')||(roles.has('Requester')&&isOwner(requesterId,userId));}
export function canEdit(roles:ReadonlySet<Role>,requesterId:string,userId:string,status:string):boolean{return roles.has('Requester')&&isOwner(requesterId,userId)&&(status==='Draft'||status==='ChangesRequested');}