import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('activities')
export class Activity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-abcdef012345' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'General Hospital Lagos' })
  @Column({ type: 'varchar', length: 255 })
  hospitalName: string;

  @ApiProperty({ example: 'Dr. Okafor' })
  @Column({ type: 'varchar', length: 255 })
  actorName: string;

  @ApiProperty({ example: 'doctor' })
  @Column({ type: 'varchar', length: 50 })
  actorRole: string;

  @ApiProperty({ example: 'Dr. Okafor dispensed medication to Mrs. Josephine' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ example: 'dispensed', nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  actionType: string | null;

  @ApiProperty({ example: 'Mrs. Josephine', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  targetPatientName: string | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
