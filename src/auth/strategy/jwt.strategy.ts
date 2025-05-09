import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Cache } from 'cache-manager';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from 'src/user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    // const user: any = await this.userService.validateUser(payload.sub);
    // return {
    //   id: user.id,
    //   username: user.username,
    //   email: user.email,
    //   role: user.role,
    // };
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const isBlacklisted = await this.cacheManager.get(`blacklist_${token}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token is blacklistedrrrrrrrrrrrr');
    }
    return { username: payload.sub, id: payload.id, role: payload.role };
  }
}
