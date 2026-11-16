import {ChangeRequestError} from './errors.js';
export class ChangeTransitionError extends ChangeRequestError{constructor(message:string){super('INVALID_TRANSITION',message);}}
export const statuses=['Draft','PendingReview','Approved','ChangesRequested'] as const;export type ChangeStatus=typeof statuses[number];
const transitions:Record<string,readonly string[]>={Draft:['PendingReview'],PendingReview:['Approved','ChangesRequested'],ChangesRequested:['PendingReview'],Approved:[]};
export function canTransition(from:ChangeStatus,to:ChangeStatus):boolean{return transitions[from]?.includes(to) ?? false;}
export function assertTransition(from:ChangeStatus,to:ChangeStatus):void{if(!canTransition(from,to))throw new ChangeTransitionError('Invalid transition: '+from+' -> '+to);}