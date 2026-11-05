import {useEffect,useId,useRef,useState} from 'react';
import {Upload,ImageOff,X} from 'lucide-react';
import {imageFileError} from '../../utils/adminProducts';
export interface ImageUploaderSuccessPayload {url:string;publicId:string;}
interface Props {value?:string|null;onChange:(file:File|null)=>void;disabled?:boolean;onError?:(message:string)=>void;}
// Selection stays local. The parent uploads only when the product form is saved.
export default function ImageUploader({value=null,onChange,disabled=false,onError}:Props){
 const input=useRef<HTMLInputElement>(null),id=useId();const[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[error,setError]=useState(''),[failed,setFailed]=useState('');
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 const url=preview||value;
 return <div className="ap-image-picker"><label htmlFor={id}>Ảnh sản phẩm</label><div className="ap-image-preview">{url&&failed!==url?<img src={url} alt="Ảnh sản phẩm đang chọn" onError={()=>setFailed(url)}/>:<div><ImageOff size={26} aria-hidden="true"/><span>{url?'Không tải được ảnh':'Chưa có ảnh'}</span></div>}</div><input id={id} ref={input} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} aria-describedby={`${id}-hint${error?` ${id}-error`:''}`} onChange={event=>{const next=event.target.files?.[0];event.target.value='';if(!next)return;const message=imageFileError(next);setError(message);if(message){onError?.(message);return;}setFile(next);onChange(next);}}/>
 <div className="ap-image-actions"><button type="button" className="ap-button" disabled={disabled} onClick={()=>input.current?.click()}><Upload size={16} aria-hidden="true"/>{url?'Đổi ảnh':'Chọn ảnh'}</button>{file&&<button type="button" className="ap-button" disabled={disabled} onClick={()=>{setFile(null);setError('');onChange(null);}}><X size={16} aria-hidden="true"/>Bỏ chọn</button>}</div><p id={`${id}-hint`} className="ap-muted">PNG, JPG, WEBP · tối đa 10 MB. {file?'Ảnh mới sẽ tải lên khi lưu.':value?'Chọn ảnh mới để thay ảnh hiện tại.':'Ảnh không bắt buộc.'}</p>{error&&<p id={`${id}-error`} className="ap-field-error" role="alert">{error}</p>}</div>;
}
