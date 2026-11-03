export function isAccountEmail(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());}
export function isResetCode(value:string){return /^\d{6}$/.test(value);}
export function authDestination(role:string){return role.toLowerCase()==='admin'?'/admin/orders':'/';}
export function accountError(cause:unknown){const message=cause instanceof Error?cause.message:'';return !message||/localhost|back-end|server api|network|timeout/i.test(message)?'Không kết nối được hệ thống. Vui lòng thử lại.':message;}
export function matchesSession(current:{token:string|null;user:{id:number}|null},expected:{token:string|null;userId:number|undefined}){return current.token===expected.token&&current.user?.id===expected.userId;}
