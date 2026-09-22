import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '../config/env';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export { cloudinary, isCloudinaryConfigured };
