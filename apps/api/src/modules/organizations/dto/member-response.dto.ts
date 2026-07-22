import { MembershipRole, UserStatus } from '@prisma/client';

export class MemberResponseDto {
  membershipId: string;

  role: MembershipRole;

  joinedAt: Date;

  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    status: UserStatus;
  };
}
