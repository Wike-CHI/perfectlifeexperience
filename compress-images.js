/**
 * 图片压缩脚本
 * 将大图片压缩到200KB以下
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const staticDir = path.join(__dirname, 'src', 'static', 'img');

// 需要压缩的图片列表
const imagesToCompress = [
  'brewery-factory.png',
  'feiyun-wheat-ale-haibao.png',
  'feiyun-wheat-ale.png',
  'feiyunxiaomai.jpeg',
  'fresh-hops-craft-beer.png',
  'gallery-02.png',
  'gallery-03.png',
  'gallery-04.png',
  'gallery-05.png',
  'gallery-06.png',
  'gallery-07.png',
  'gallery-08.png',
  'gallery-09.png',
  'gallery-10.png',
  'ruian-scenery.png'
];

async function compressImage(filename) {
  const inputPath = path.join(staticDir, filename);
  const backupPath = path.join(staticDir, 'backup', filename);

  if (!fs.existsSync(inputPath)) {
    console.log(`跳过: ${filename} (不存在)`);
    return;
  }

  const stats = fs.statSync(inputPath);
  const originalSizeKB = Math.round(stats.size / 1024);

  // 创建备份目录
  const backupDir = path.join(staticDir, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 备份原图
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log(`备份: ${filename}`);
  }

  try {
    // 根据原图大小决定压缩参数
    let quality = 80;
    let maxWidth = 1920;

    if (originalSizeKB > 10000) { // > 10MB
      quality = 60;
      maxWidth = 1200;
    } else if (originalSizeKB > 5000) { // > 5MB
      quality = 70;
      maxWidth = 1500;
    } else if (originalSizeKB > 1000) { // > 1MB
      quality = 75;
      maxWidth = 1600;
    }

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // 如果图片宽度大于maxWidth，则缩放
    let resizeOptions = {};
    if (metadata.width > maxWidth) {
      resizeOptions = { width: maxWidth };
    }

    // 压缩并保存为JPEG格式（更小的文件大小）
    const outputPath = inputPath.replace(/\.png$/i, '.jpg').replace(/\.jpeg$/i, '.jpg');

    await image
      .clone()
      .resize(resizeOptions)
      .jpeg({ quality, mozjpeg: true, force: true })
      .toFile(outputPath);

    const newStats = fs.statSync(outputPath);
    const newSizeKB = Math.round(newStats.size / 1024);
    const reduction = Math.round((1 - newSizeKB / originalSizeKB) * 100);

    // 如果输出文件是jpg且原图是png，删除原png文件
    if (outputPath !== inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
      console.log(`转换: ${filename} -> ${path.basename(outputPath)}`);
    }

    console.log(`压缩: ${filename} ${originalSizeKB}KB -> ${newSizeKB}KB (减少${reduction}%)`);

    // 如果压缩后仍然超过200KB，进一步压缩
    if (newSizeKB > 200) {
      let finalQuality = quality;
      while (finalQuality > 30) {
        finalQuality -= 10;
        await sharp(backupPath)
          .resize(resizeOptions)
          .jpeg({ quality: finalQuality, mozjpeg: true, force: true })
          .toFile(outputPath);

        const finalStats = fs.statSync(outputPath);
        const finalSizeKB = Math.round(finalStats.size / 1024);

        if (finalSizeKB <= 200) {
          console.log(`  再次压缩: ${newSizeKB}KB -> ${finalSizeKB}KB (quality=${finalQuality})`);
          break;
        }
      }
    }
  } catch (error) {
    console.error(`压缩失败 ${filename}:`, error.message);
  }
}

async function main() {
  console.log('开始压缩图片...\n');

  for (const filename of imagesToCompress) {
    await compressImage(filename);
  }

  console.log('\n压缩完成！');
  console.log('原图已备份到 src/static/img/backup/ 目录');
}

main().catch(console.error);
