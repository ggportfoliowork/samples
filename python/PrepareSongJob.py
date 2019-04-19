import os
import sys
import json
import boto3
import logging
from subprocess import Popen, PIPE, STDOUT
from dotenv import load_dotenv

env_path = '.env'
load_dotenv(env_path)

client = boto3.client('s3', aws_access_key_id=os.getenv('AWS_ACCESS_KEY'), aws_secret_access_key=os.getenv('AWS_ACCESS_SECRET'))

def processor(event, context):
    value = event['SongID']

    args = [
        os.getenv("YOUTUBE_DL"),
        '--verbose',
        '--no-cache-dir',
        '-o/tmp/'+value+'.mp3',
        '-f 140',
        '--extract-audio',
        '--metadata-from-title',
        '--xattrs',
        '--ffmpeg-location=' + os.getenv('FFMPEG'),
        'https://www.youtube.com/watch?v='+value
    ]

    process = Popen(args, stdout=PIPE, stderr=STDOUT)

    with process.stdout:
            log_subprocess_output(process.stdout)

    exitcode = process.wait()

    if(exitcode == 0):
        client.upload_file('/tmp/'+value+'.m4a', os.getenv("AWS_S3_BUCKET"), 'song-queue/'+value+'.m4a')
        return {"Success": "Filed successfully stored"}
    else:
        return {"Failed": exitcode}

def log_subprocess_output(pipe):
    for line in iter(pipe.readline, b''):
        print(line)
