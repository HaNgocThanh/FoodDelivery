export type MembershipTier=0|1|2|3;
export interface AuthApiResponse { token:string; userId:number; fullName:string; email:string; role:string; expiresAt:string; }
export interface UserProfile { id:number; fullName:string; email:string; phoneNumber:string; address1:string; address2?:string; loyaltyPoints:number; tier:MembershipTier|string; role:string; }
