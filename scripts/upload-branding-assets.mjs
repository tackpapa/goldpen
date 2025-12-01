import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// .env.local에서 서비스 키 읽기
const envPath = path.join(projectRoot, '.env.local');
let serviceKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (match) serviceKey = match[1].trim();
}

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabaseUrl = 'https://ipqhhqduppzvsqwwzjkp.supabase.co';
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  // 버킷 목록 확인
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }
  console.log('Available buckets:', buckets.map(b => b.name));

  // 'assets' 버킷이 있는지 확인
  const assetsBucket = buckets?.find(b => b.name === 'assets');
  if (!assetsBucket) {
    console.log('Creating assets bucket...');
    const { data, error: createError } = await supabase.storage.createBucket('assets', {
      public: true
    });
    if (createError) {
      console.error('Error creating bucket:', createError);
      return;
    }
    console.log('Assets bucket created successfully');
  } else {
    console.log('Assets bucket already exists');
  }

  // 로고 파일 업로드
  const logoPath = path.join(projectRoot, 'Goldpen_logo.png');
  const iconPath = path.join(projectRoot, 'goldpenicon.png');

  if (fs.existsSync(logoPath)) {
    const logoFile = fs.readFileSync(logoPath);
    const { data, error: uploadError } = await supabase.storage
      .from('assets')
      .upload('branding/goldpen-logo.png', logoFile, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
    } else {
      console.log('Logo uploaded successfully:', data);
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl('branding/goldpen-logo.png');
      console.log('Logo public URL:', urlData.publicUrl);
    }
  } else {
    console.log('Logo file not found at:', logoPath);
  }

  if (fs.existsSync(iconPath)) {
    const iconFile = fs.readFileSync(iconPath);
    const { data, error: uploadError } = await supabase.storage
      .from('assets')
      .upload('branding/goldpen-icon.png', iconFile, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading icon:', uploadError);
    } else {
      console.log('Icon uploaded successfully:', data);
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl('branding/goldpen-icon.png');
      console.log('Icon public URL:', urlData.publicUrl);
    }
  } else {
    console.log('Icon file not found at:', iconPath);
  }
}

main().catch(console.error);
