import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Media Upload Input Component
export function MediaUploadInput({
    value,
    onChange,
    disabled,
    translations,
  }: {
    value: string
    onChange: (uuid: string) => void
    disabled?: boolean
    translations?: any
  }) {
    const [uploading, setUploading] = React.useState(false)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
  
    // Load preview if value exists
    React.useEffect(() => {
      if (value) {
        setPreviewUrl(`/api/altrp/v1/admin/files/${value}`)
      } else {
        setPreviewUrl(null)
      }
    }, [value])
  
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
  
      // Validate image file
      if (!file.type.startsWith('image/')) {
        alert(translations?.form?.invalidImage || 'Please select an image file')
        return
      }
  
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/altrp/v1/admin/files/upload-for-public', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
  
        if (!response.ok) {
          throw new Error('Upload failed')
        }
  
        const result = await response.json() as { success: boolean; data?: { uuid: string } }
        if (result.success && result.data?.uuid) {
          onChange(result.data.uuid)
        } else {
          throw new Error('Upload response invalid')
        }
      } catch (error) {
        console.error('Failed to upload image:', error)
        alert(translations?.form?.uploadError || 'Failed to upload image')
      } finally {
        setUploading(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
  
    const handleRemove = () => {
      onChange('')
      setPreviewUrl(null)
    }
  
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Preview"
                className="h-20 w-20 rounded object-cover border"
                onError={() => setPreviewUrl(null)}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                >
                  {uploading ? (translations?.form?.uploading || 'Uploading...') : (translations?.form?.changeImage || 'Change Image')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled || uploading}
                >
                  {translations?.form?.remove || 'Remove'}
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="w-full"
            >
              {uploading ? (translations?.form?.uploading || 'Uploading...') : (translations?.form?.uploadImage || 'Upload Image')}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />
        </div>
        {value && (
          <Input
            type="text"
            value={value}
            readOnly
            className="font-mono text-xs"
            placeholder="Media UUID"
          />
        )}
      </div>
    )
}