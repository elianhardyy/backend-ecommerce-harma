import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class AwsS3Service {
  private S3: S3;

  constructor(private configService: ConfigService) {
    this.S3 = new S3({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const { originalname, buffer, mimetype } = file;
    const uuid = uuidv4();
    //const key = `${folder}/${uuid}.${originalname.split('.').pop()}`;
    const key = `${folder}/${uuid}-${originalname}`;
    const params = {
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read',
    };

    try {
      const uploadResult = await this.S3.upload(params).promise();
      return uploadResult.Location;
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = fileUrl.split('/').slice(3).join('/');

      const params = {
        Bucket: this.configService.get<string>('AWS_BUCKET_NAME'),
        Key: key,
      };

      await this.S3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }
}
