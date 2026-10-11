import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string, selectPrivate = false): Promise<UserDocument | null> {
    if (selectPrivate) {
      return this.userModel
        .findOne({ email: email.toLowerCase() })
        .select('+password +emailOtp +emailOtpExpiry +resetPasswordOtp +resetPasswordOtpExpiry')
        .exec();
    }
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string, selectPrivate = false): Promise<UserDocument | null> {
    if (selectPrivate) {
      return this.userModel
        .findById(id)
        .select('+password +emailOtp +emailOtpExpiry +resetPasswordOtp +resetPasswordOtpExpiry')
        .exec();
    }
    return this.userModel.findById(id).exec();
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async updateById(id: string, update: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }
}
