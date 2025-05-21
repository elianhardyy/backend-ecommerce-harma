import { UserRole } from 'src/user/enums/user.role';

export type JwtClaims = {
  sub: string;
  id: string;
  role: UserRole;
};
