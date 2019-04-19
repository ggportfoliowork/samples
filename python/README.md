# Musenyx Song Preparer

## Requirements
-  Python 3.6 / PIP
-  exodus bundler (https://github.com/intoli/exodus)
-  youtube-dl (https://ytdl-org.github.io/youtube-dl/index.html)
-  ffmpeg (https://ffmpeg.org)

## Setup
-  `pip install Pillow --target .`
-  `Set environment variables`
-  `cp .env.example .env`

## Tarball YouTube-DL & FFMPEG
`exodus --tarball youtube-dl | tar -zx && exodus --tarball ffmpeg | tar -zx`

### FFMPEG Notes
`--enable-small`

## Test
`python PrepareSongJob.py`

## Lambda Deployment
-  exodus/
-  PrepareSongJob.py
-  PIL
-  dotenv
-  Pillow-6.0.0.dist-info

## Package Deployment
`zip -r9 ../PrepareSongJob.zip .`

## Lambda Deployment Script
`aws lambda update-function-code --function-name {function_name} --region {s3_region} --s3-bucket {s3_bucket} --s3-key PrepareSongJob.zip`
