import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis.js';
import ReportGate from '../../components/dashboard/ReportGate.jsx';
import SkillTable from '../../components/skills/SkillTable.jsx';
import { PageHeading, Note } from '../../components/common/UI.jsx';
import './Skills.css';
export default function Skills() {
  const resource = useAnalysis();
  return <ReportGate resource={resource}>{analysis => <><PageHeading eyebrow={`@${analysis.githubUsername} / Skill map`} title="Every skill. Its supporting evidence." description="Explore resume claims and additional skills discovered in public repositories." action={<Link className="btn btn-secondary" to={`/analysis/${analysis._id}`}><ArrowLeft size={15}/>Overview</Link>}/><SkillTable skills={analysis.skills} analysisId={analysis._id}/><div className="mt-6"><Note>Scores use capped, rule-based evidence signals. Supporting repository activity is not attributed to a specific skill. Results reflect a limited snapshot of public work.</Note></div></>}</ReportGate>;
}
