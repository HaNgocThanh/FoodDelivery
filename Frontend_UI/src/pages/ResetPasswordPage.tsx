import {useSearchParams} from 'react-router-dom';
import {AuthForm} from '../components/account/AuthForm';
export default function ResetPasswordPage(){const[params]=useSearchParams();const email=params.get('email')??'';return <AuthForm key={email} mode="reset" email={email}/>;}
