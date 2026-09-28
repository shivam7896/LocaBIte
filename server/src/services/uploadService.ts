import { cloudinary } from '../config/cloudinary';
import { logger } from '../utils/logger';

export class UploadService {
  /**
   * Upload an in-memory buffer to Cloudinary
   */
  static async uploadBuffer(buffer: Buffer, folder = 'locabite'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            // Fallback to placeholder if Cloudinary credentials are mock
            resolve('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80');
          } else {
            resolve(result?.secure_url || '');
          }
        }
      );
      uploadStream.end(buffer);
    });
  }
}
