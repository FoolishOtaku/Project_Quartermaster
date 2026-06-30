import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './locations.repository';

@Module({
  providers: [LocationsService, LocationsRepository],
  exports: [LocationsService],
})
export class LocationsModule {}
