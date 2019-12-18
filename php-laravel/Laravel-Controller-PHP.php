<?php

namespace App\Http\Controllers\Api\Media;

use Response;
use App\Models\Media;
use App\Http\Controllers\Controller;
use App\Services\Media\MediaCreator;
use App\Services\Media\MediaUpdater;
use App\Services\Media\MediaProcessor;
use App\Http\Resources\Media\MediaResource;
use App\Http\Requests\Media\CreateMediaRequest;
use App\Http\Requests\Media\UpdateMediaRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class MediaController extends Controller
{
    public function show(Media $media)
    {
        return new MediaResource($media);
    }

    public function store(CreateMediaRequest $request, MediaProcessor $mediaProcessor, MediaCreator $creator)
    {
        $file = $mediaProcessor->moveUploadedFileToTemporaryStorage($request->file);
        $media = $creator->create($request->except('file'), $file);
        return new MediaResource($media);
    }

    public function update(Media $media, UpdateMediaRequest $request, MediaUpdater $updater)
    {
        $media = $updater->update($media, $request->all());
        return new MediaResource($media);
    }

    public function destroy(Media $media)
    {
        $media->delete();
        return $this->responder()->json(['message' => "The media file has been deleted."]);
    }
}
