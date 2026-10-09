import React, { useState } from 'react';
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Check,
  ChevronRight,
  XCircle,
  Filter,
  Users,
  Radio,
  X,
} from 'lucide-react';
import { Event, Shift, Volunteer, ShiftAssignment } from '../../types/vms';
import { SkillMatchingService } from '../../services/skillMatchingService';
import { ApiClient } from '../../services/apiClient';

interface BrowseEventsProps {
  events: Event[];
  volunteer: Volunteer;
  myAssignments: ShiftAssignment[];
  onApplicationSuccess: (assignment: ShiftAssignment) => void;
}

export const BrowseEvents: React.FC<BrowseEventsProps> = ({
  events,
  volunteer,
  myAssignments,
  onApplicationSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [applyingShiftId, setApplyingShiftId] = useState<number | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ shiftId: number; text: string; isError?: boolean } | null>(null);

  const categories = ['All', 'Food Distribution', 'Elderly Care', 'Environmental', 'Disaster Relief'];

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.venue_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // POST /api/volunteer/shifts/{id}/apply
  const handleApplyShift = async (shift: Shift) => {
    setApplyingShiftId(shift.id);
    setActionFeedback(null);
    const res = await ApiClient.request('POST', `/api/volunteer/shifts/${shift.id}/apply`);
    setApplyingShiftId(null);
    if (res.status === 201 || res.status === 200) {
      onApplicationSuccess(res.data);
      setActionFeedback({ shiftId: shift.id, text: '✓ Application submitted! Coordinator will review your credentials.' });
    } else {
      setActionFeedback({ shiftId: shift.id, text: res.error || 'Failed to apply', isError: true });
    }
  };

  // DELETE /api/volunteer/apply/{assignmentId}
  const handleWithdraw = async (shift: Shift, assignmentId: number) => {
    setWithdrawingId(assignmentId);
    setActionFeedback(null);
    const res = await ApiClient.request('DELETE', `/api/volunteer/apply/${assignmentId}`);
    setWithdrawingId(null);
    if (res.status === 200) {
      onApplicationSuccess({ ...({} as ShiftAssignment), shift_id: shift.id, status: 'cancelled' as any });
      setActionFeedback({ shiftId: shift.id, text: '✓ Application withdrawn successfully.' });
    } else {
      setActionFeedback({ shiftId: shift.id, text: res.error || 'Failed to withdraw', isError: true });
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Filter / Search Bar */}
      <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                VOLUNTEER OPPORTUNITIES DIRECTORY
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                {filteredEvents.length} ACTIVE EVENTS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              AI Skill Matching (§4) calculates eligibility based on: {volunteer.skills.join(', ')}
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by keyword, venue..."
              className="w-full bg-slate-900 text-slate-200 text-xs font-mono pl-8 pr-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden transition-all hover:border-slate-600"
          >
            <div className="p-3.5 space-y-3">
              {/* Event Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-indigo-400 border border-slate-700">
                      {event.category}
                    </span>
                    <h3 className="text-sm font-mono font-bold text-white tracking-tight">
                      {event.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 shrink-0">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {event.start_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {event.venue_name} ({event.geofence_radius}m)
                  </span>
                </div>
              </div>

              {/* Shifts Grid within Event */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  AVAILABLE SHIFTS & AI SKILL MATCHING:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {event.shifts?.map((shift) => {
                    const match = SkillMatchingService.assessEligibility(
                      volunteer.skills,
                      shift.required_skills
                    );
                    const myAssignment = myAssignments.find((a) => a.shift_id === shift.id);
                    const isApplying = applyingShiftId === shift.id;
                    const isWithdrawing = myAssignment ? withdrawingId === myAssignment.id : false;
                    const isFull = shift.is_full || (shift.available_slots !== undefined && shift.available_slots <= 0);

                    return (
                      <div
                        key={shift.id}
                        className="bg-slate-900 border border-slate-700 rounded p-2.5 flex flex-col justify-between gap-2 relative"
                      >
                        {shift.is_urgent && (
                          <span className="absolute -top-1.5 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            ⚡ URGENT NEED
                          </span>
                        )}

                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-mono font-bold text-slate-200">
                              {shift.title}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                                match.score === 100
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : match.score >= 50
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {match.score}% MATCH
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{shift.start_time.substring(11, 16)} - {shift.end_time.substring(11, 16)}</span>
                            <span>•</span>
                            <span className="text-slate-300 font-mono">
                              {shift.available_slots ?? shift.capacity} SLOTS LEFT
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {shift.required_skills.map((skill, si) => {
                              const isMatched = volunteer.skills.includes(skill);
                              return (
                                <span
                                  key={si}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1 ${
                                    isMatched
                                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {isMatched && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                                  <span>{skill}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Action Row */}
                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-2">
                          {myAssignment ? (
                            <div className="flex w-full items-center justify-between gap-2">
                              <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
                                myAssignment.status === 'approved' || myAssignment.status === 'completed'
                                  ? 'text-emerald-400'
                                  : myAssignment.status === 'rejected' || myAssignment.status === 'cancelled'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="uppercase">{myAssignment.status}</span>
                              </span>
                              {/* DELETE /api/volunteer/apply/{id} — only for pending */}
                              {(myAssignment.status === 'applied' || myAssignment.status === 'pending') && (
                                <button
                                  onClick={() => handleWithdraw(shift, myAssignment.id)}
                                  disabled={isWithdrawing}
                                  className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] font-mono font-bold border border-rose-800 transition-all flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  {isWithdrawing ? 'WITHDRAWING…' : 'WITHDRAW (DELETE)'}
                                </button>
                              )}
                            </div>
                          ) : (
                            /* POST /api/volunteer/shifts/{id}/apply */
                            <button
                              onClick={() => handleApplyShift(shift)}
                              disabled={isApplying || isFull}
                              className={`w-full py-1 rounded text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                                isFull
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm border border-indigo-400/40'
                              }`}
                            >
                              {isApplying ? (
                                'SUBMITTING…'
                              ) : isFull ? (
                                'CAPACITY REACHED'
                              ) : (
                                <>
                                  <span>APPLY FOR SHIFT</span>
                                  <ChevronRight className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Feedback Banner */}
                        {actionFeedback && actionFeedback.shiftId === shift.id && (
                          <div
                            className={`p-1.5 rounded text-[10px] font-mono mt-1 ${
                              actionFeedback.isError
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {actionFeedback.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
