import { MembershipRole, UserStatus } from '@prisma/client';

export class MembershipResponseDto {
  id: string;

  role: MembershipRole;

  createdAt: Date;

  updatedAt: Date;

  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: UserStatus;
  };
}