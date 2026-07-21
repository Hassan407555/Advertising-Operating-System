import { MembershipRole, UserStatus } from '@prisma/client';

export interface MembershipResponse {
  id: string;
  role: MembershipRole;
  createdAt: Date;

  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: UserStatus;
  };
}