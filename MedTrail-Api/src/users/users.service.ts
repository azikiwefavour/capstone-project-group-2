import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string, selectPrivate = false): Promise<User | null> {
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
      ]);
    }

    return qb.getOne();
  }

  async findById(id: string, selectPrivate = false): Promise<User | null> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id });

    if (selectPrivate) {
      qb.addSelect([
        'user.password',
        'user.emailOtp',
        'user.emailOtpExpiry',
        'user.resetPasswordOtp',
        'user.resetPasswordOtpExpiry',
      ]);
    }

    return qb.getOne();
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async updateById(id: string, update: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, update);
    return this.findById(id);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
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
  }
}
