import { Membership, User } from '@prisma/client';

import { MemberResponseDto } from '../dto/member-response.dto';

type MembershipWithUser = Membership & {
  user: Pick<
    User,
    'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl' | 'status'
  >;
};

export class MemberMapper {
  static toDto(membership: MembershipWithUser): MemberResponseDto {
    return {
      membershipId: membership.id,
      role: membership.role,
      joinedAt: membership.createdAt,
      user: {
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        email: membership.user.email,
        avatarUrl: membership.user.avatarUrl,
        status: membership.user.status,
      },
    };
  }
}
