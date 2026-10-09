import React, { useState } from 'react';
import {
  User,
  Sparkles,
  Save,
  CheckCircle2,
  Phone,
  Tag,
  Plus,
  X,
} from 'lucide-react';
import { Volunteer, User as UserType } from '../../types/vms';
import { VmsStore } from '../../services/vmsStore';

interface VolunteerProfileProps {
  volunteer: Volunteer;
  user: UserType;
  onSaveSuccess: (updatedVolunteer: Volunteer) => void;
}

export const VolunteerProfile: React.FC<VolunteerProfileProps> = ({
  volunteer,
  user,
  onSaveSuccess,
}) => {
  const [skills, setSkills] = useState<string[]>(volunteer.skills || []);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [bio, setBio] = useState(volunteer.bio || '');
  const [emergencyContact, setEmergencyContact] = useState(volunteer.emergency_contact || '');
  const [isSaved, setIsSaved] = useState(false);

  const availableSuggestions = [
    'Food Prep',
    'Logistics',
    'First Aid',
    'Driver License',
    'Translation (Spanish)',
    'Inventory Management',
    'Public Speaking',
    'Crowd Safety',
    'Childcare Support',
  ];

  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveProfile = () => {
    const db = VmsStore.get();
    const v = db.volunteers.find((vol) => vol.id === volunteer.id);
    if (v) {
      v.skills = skills;
      v.bio = bio;
      v.emergency_contact = emergencyContact;
      VmsStore.save();
      onSaveSuccess({ ...v });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3.5">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              VOLUNTEER PROFILE & COMPETENCY ROSTER
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              VOL-{volunteer.id.toString().padStart(4, '0')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Configure skills inventory, emergency contact, and service background.
          </p>
        </div>
      </div>

      <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700 space-y-4">
        {/* User Details */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
          <div className="w-12 h-12 rounded bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono font-bold text-base shrink-0">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-white">{user.name}</h3>
            <p className="text-xs text-slate-400 font-mono">{user.email} • {user.phone}</p>
            <span className="inline-block mt-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              VERIFIED VOLUNTEER (ID: VOL-{volunteer.id.toString().padStart(4, '0')})
            </span>
          </div>
        </div>

        {/* Skills Tag Management */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>ACTIVE VERIFIED COMPETENCIES ({skills.length}):</span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add skill input */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              placeholder="Add custom qualification..."
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono px-3 py-1.5 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleAddSkill()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded border border-slate-600 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD</span>
            </button>
          </div>

          {/* Suggestions */}
          <div className="pt-1">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">SUGGESTED SKILLS:</span>
            <div className="flex flex-wrap gap-1">
              {availableSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddSkill(s)}
                  className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 border border-slate-800"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-1 pt-1">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-indigo-400" />
            <span>EMERGENCY CONTACT PHONE:</span>
          </label>
          <input
            type="text"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="+1 (555) 987-6543 (Parent / Spouse / Next of Kin)"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono px-3 py-1.5 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Bio / Background */}
        <div className="space-y-1 pt-1">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>BACKGROUND & EXPERIENCE SUMMARY:</span>
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your background and volunteer interests..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono px-3 py-1.5 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Save button */}
        <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
          {isSaved ? (
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>PROFILE PERSISTED SUCCESSFULLY</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-400">
              Changes sync directly to PostgreSQL tenant partition.
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveProfile}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs rounded border border-indigo-400/40 shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE PROFILE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
