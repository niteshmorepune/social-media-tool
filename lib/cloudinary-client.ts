import { v2 as cloudinary } from 'cloudinary'

// Server-only — never import in client components
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadFromUrl(
  url:          string,
  folder:       string,
  resourceType: 'image' | 'video' = 'image'
): Promise<string> {
  const result = await cloudinary.uploader.upload(url, {
    folder:        `social-media-tool/${folder}`,
    resource_type: resourceType,
  })
  return result.secure_url
}

export default cloudinary
