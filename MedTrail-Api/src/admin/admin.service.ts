import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(private usersService: UsersService) {}

  async getDashboardStats() {
    const users = await this.usersService.findAll();
    const total = users.length;
    const byRole = users.reduce(
      (acc, u) => {
        if (u.role) acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const verified = users.filter((u) => u.isEmailVerified).length;

    return { totalUsers: total, byRole, verified, unverified: total - verified };
  }

  async getAllUsers() {
    return this.usersService.findAll();
  }

  async removeUser(id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
