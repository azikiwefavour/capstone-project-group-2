import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from './entities/user.entity';

/** Cache key helpers — keep keys consistent across the service */
const CACHE_KEYS = {
  user: (id: string) => `user:${id}`,
  allUsers: 'users:all',
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────

  async findByEmail(email: string, selectPrivate = false): Promise<User | null> {
    // Email lookups are used mainly during auth flows (login, OTP) where we
    // always need fresh data — so we skip the cache here intentionally.
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email });

    if (selectPrivate) {
      qb.addSelect([
        'user.password',
        'user.emailOtp',
        'user.emailOtpExpiry',
        'user.resetPasswordOtp',
        'user.resetPasswordOtpExpiry',
        'user.invitationToken',
        'user.invitationTokenExpiry',
      ]);
    }

    return qb.getOne();
  }

  async findById(id: string, selectPrivate = false): Promise<User | null> {
    // Only cache public (non-sensitive) lookups
    if (!selectPrivate) {
      const cacheKey = CACHE_KEYS.user(id);
      const cached = await this.cacheManager.get<User>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT  → user:${id}`);
        return cached;
      }

      this.logger.debug(`Cache MISS → user:${id} — querying DB`);
      const qb = this.userRepository
        .createQueryBuilder('user')
        .where('user.id = :id', { id });

      const user = await qb.getOne();
      if (user) await this.cacheManager.set(cacheKey, user);
      return user;
    }

    // Private fetch — always go to DB
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .addSelect([
        'user.password',
        'user.emailOtp',
        'user.emailOtpExpiry',
        'user.resetPasswordOtp',
        'user.resetPasswordOtpExpiry',
        'user.invitationToken',
        'user.invitationTokenExpiry',
      ]);

    return qb.getOne();
  }

  /**
   * Finds an invited (pending) user by their invitation token.
   * Always fetches from DB (tokens are security-sensitive, skip cache).
   */
  async findByInvitationToken(token: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.invitationToken = :token', { token })
      .addSelect(['user.invitationToken', 'user.invitationTokenExpiry', 'user.password'])
      .getOne();
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    const saved = await this.userRepository.save(user);
    // Invalidate the "all users" list so it reflects the new entry
    await this.cacheManager.del(CACHE_KEYS.allUsers);
    this.logger.log(`User created: ${saved.email} [id: ${saved.id}]`);
    return saved;
  }

  async updateById(id: string, update: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, update);
    // Invalidate cached copy so next read fetches fresh data
    await this.cacheManager.del(CACHE_KEYS.user(id));
    await this.cacheManager.del(CACHE_KEYS.allUsers);
    this.logger.log(`User updated [id: ${id}] — cache invalidated`);
    return this.findById(id);
  }

  async findAll(): Promise<User[]> {
    const cached = await this.cacheManager.get<User[]>(CACHE_KEYS.allUsers);
    if (cached) {
      this.logger.debug(`Cache HIT  → users:all (${cached.length} records)`);
      return cached;
    }

    this.logger.debug('Cache MISS → users:all — querying DB');
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    await this.cacheManager.set(CACHE_KEYS.allUsers, users);
    return users;
  }

  /**
   * Returns only invited users (doctor/pharmacist added by admin),
   * ordered newest first. Used by admin to track pending invitations.
   */
  async findAllInvited(): Promise<User[]> {
    return this.userRepository.find({
      where: { isInvited: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
    // Clean up both caches after deletion
    await this.cacheManager.del(CACHE_KEYS.user(id));
    await this.cacheManager.del(CACHE_KEYS.allUsers);
    this.logger.warn(`User deleted [id: ${id}] — cache invalidated`);
  }
}
