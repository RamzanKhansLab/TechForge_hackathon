import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/common/UI.jsx';
import './NotFound.css';
export default function NotFound() { return <EmptyState title="This page went off the trail." description="The link may be incomplete, or the page may have moved. Your saved reports are a good place to start." action={<Link className="btn btn-primary" to="/reports">Open saved reports</Link>}/>; }
