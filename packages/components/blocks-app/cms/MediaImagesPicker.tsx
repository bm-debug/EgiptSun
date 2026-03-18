"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Upload, X, Image as ImageIcon, Loader2, Search, Plus } from "lucide-react";
import Image from "next/image";

interface Media {
  uuid: string;
  fileName: string;
  title: string;
  url: string;
  alt?: string;
  type?: string;
  mimeType?: string;
}

interface MediaImagesPickerProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  showUploadButton?: boolean;
  className?: string;
}

function getMediaUrl(media: Media): string {
  return media.url || (media.fileName ? `/media/${media.fileName}` : media.uuid);
}

export function MediaImagesPicker({
  value = [],
  onChange,
  disabled = false,
  placeholder = "Select images from media...",
  showUploadButton = true,
  className = "",
}: MediaImagesPickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urls = Array.isArray(value) ? value : value ? [value] : [];

  const loadMediaList = useCallback(async (search?: string) => {
    setIsLoadingMedia(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("limit", "100");
      const response = await fetch(`/api/altrp/v1/admin/files/list?${params.toString()}`);
      const data = (await response.json()) as { success?: boolean; data?: Media[] };
      if (data.success && data.data) setMediaList(data.data);
    } catch (error) {
      console.error("Error loading media list:", error);
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    if (isPopoverOpen) {
      const timeoutId = setTimeout(() => loadMediaList(searchQuery), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isPopoverOpen, searchQuery, loadMediaList]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file || !file.type.startsWith("image/")) return;
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("filename", file.name);
        const response = await fetch("/api/altrp/v1/admin/files/upload-for-public", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Upload failed");
        const result = (await response.json()) as { success?: boolean; data?: { url?: string; fileName?: string; uuid?: string } };
        if (result.success && result.data) {
          const newUrl =
            result.data.url ??
            (result.data.fileName ? `/media/${result.data.fileName}` : result.data.uuid ?? "");
          if (!newUrl) {
            throw new Error("Upload succeeded, but media URL is missing");
          }
          onChange([...urls, newUrl]);
          await loadMediaList(searchQuery);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        alert(error instanceof Error ? error.message : "Upload failed");
      }
    },
    [onChange, urls, loadMediaList, searchQuery]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleMedia = (media: Media) => {
    const mediaUrl = getMediaUrl(media);
    const idx = urls.indexOf(mediaUrl);
    if (idx >= 0) {
      onChange(urls.filter((_, i) => i !== idx));
    } else {
      onChange([...urls, mediaUrl]);
    }
  };

  const removeUrl = (url: string) => {
    onChange(urls.filter((u) => u !== url));
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((url) => (
          <div
            key={url}
            className="relative w-16 h-16 rounded-md overflow-hidden border bg-muted group"
          >
            <Image
              src={url}
              alt=""
              width={64}
              height={64}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
            <Plus className="h-4 w-4" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0 z-[9999] bg-background border shadow-lg"
          align="start"
          side="bottom"
          sideOffset={8}
        >
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoadingMedia ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : mediaList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {searchQuery ? "No media found" : "No media available"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {mediaList.map((media) => {
                  const mediaUrl = getMediaUrl(media);
                  const isSelected = urls.includes(mediaUrl);
                  return (
                    <div
                      key={media.uuid}
                      className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleMedia(media)}
                    >
                      <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-muted">
                        <Image
                          src={media.url}
                          alt={media.alt || media.title}
                          width={48}
                          height={48}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{media.title}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {showUploadButton && (
            <div className="p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsPopoverOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
