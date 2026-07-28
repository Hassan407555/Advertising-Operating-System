export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  avatarUrl?: string;
}
