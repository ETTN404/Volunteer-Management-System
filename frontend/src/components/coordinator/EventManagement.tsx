import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Plus,
  Compass,
  Tag,
  Users,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  Loader2,
  Check,
} from 'lucide-react';
import { Event, Shift, Organization } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface EventManagementProps {
  events: Event[];
  shifts: Shift[];
  org: Organization;
  onDataChanged: () => void;
}

export const EventManagement: React.FC<EventManagementProps> = ({
  events,
  shifts,
  org,
  onDataChanged,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [addingShiftEventId, setAddingShiftEventId] = useState<number | null>(null);

  // Form State - Event
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food Distribution');
  const [venueName, setVenueName] = useState('Central Community Center');
  const [venueAddress, setVenueAddress] = useState('456 Market St, San Francisco, CA');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-01');

  // Initial Shift inside Create Event Form
  const [shiftTitle, setShiftTitle] = useState('Morning Operations');
  const [shiftCapacity, setShiftCapacity] = useState(10);
  const [requiredSkills, setRequiredSkills] = useState('Food Prep, Logistics, First Aid');

  // Standalone Add Shift Form State
  const [newShiftTitle, setNewShiftTitle] = useState('Afternoon Shift');
  const [newShiftCapacity, setNewShiftCapacity] = useState(8);
  const [newShiftStartTime, setNewShiftStartTime] = useState('2026-09-01 13:00:00');
  const [newShiftEndTime, setNewShiftEndTime] = useState('2026-09-01 17:00:00');
  const [newShiftSkills, setNewShiftSkills] = useState('Logistics, Driver License');

  // Loading / Feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id?: number; text: string; isError?: boolean } | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Food Distribution');
    setVenueName('Central Community Center');
    setVenueAddress('456 Market St, San Francisco, CA');
    setLatitude(37.7749);
    setLongitude(-122.4194);
    setGeofenceRadius(100);
    setStartDate('2026-09-01');
    setEndDate('2026-09-01');
    setShiftTitle('Morning Operations');
    setShiftCapacity(10);
    setRequiredSkills('Food Prep, Logistics, First Aid');
  };

  const openCreateModal = () => {
    resetForm();
    setEditingEvent(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setCategory(event.category);
    setVenueName(event.venue_name);
    setVenueAddress(event.venue_address);
    setLatitude(event.latitude);
    setLongitude(event.longitude);
    setGeofenceRadius(event.geofence_radius);
    setStartDate(event.start_date);
    setEndDate(event.end_date);
    setIsCreateModalOpen(true);
  };

  // POST /api/coordinator/events or PATCH /api/coordinator/events/{id}
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMsg(null);

    if (editingEvent) {
      // PATCH /api/coordinator/events/{id}
      const res = await ApiClient.request('PATCH', `/api/coordinator/events/${editingEvent.id}`, {
        title,
        description,
        category,
        venue_name: venueName,
        venue_address: venueAddress,
        latitude,
        longitude,
        geofence_radius: geofenceRadius,
        start_date: startDate,
        end_date: endDate,
      });

      setIsSubmitting(false);
      if (res.status === 200) {
        setIsCreateModalOpen(false);
        setEditingEvent(null);
        onDataChanged();
        setFeedbackMsg({ text: '✓ Event updated successfully!' });
      } else {
        setFeedbackMsg({ text: res.error || 'Failed to update event', isError: true });
      }
    } else {
      // POST /api/coordinator/events
      const payload = {
        title,
        description,
        category,
        venue_name: venueName,
        venue_address: venueAddress,
        latitude,
        longitude,
        geofence_radius: geofenceRadius,
        start_date: startDate,
        end_date: endDate,
        shifts: [
          {
            title: shiftTitle,
            capacity: shiftCapacity,
            start_time: `${startDate} 09:00:00`,
            end_time: `${startDate} 13:00:00`,
            required_skills: requiredSkills.split(',').map((s) => s.trim()),
            is_urgent: false,
          },
        ],
      };

      const res = await ApiClient.request('POST', '/api/coordinator/events', payload);
      setIsSubmitting(false);

      if (res.status === 201 || res.status === 200) {
        setIsCreateModalOpen(false);
        onDataChanged();
        setFeedbackMsg({ text: '✓ Event & initial shift created successfully!' });
      } else {
        setFeedbackMsg({ text: res.error || 'Failed to create event', isError: true });
      }
    }
  };

  // DELETE /api/coordinator/events/{id}
  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    setDeletingId(eventId);
    const res = await ApiClient.request('DELETE', `/api/coordinator/events/${eventId}`);
    setDeletingId(null);

    if (res.status === 200) {
      onDataChanged();
      setFeedbackMsg({ text: `✓ Event #${eventId} deleted.` });
    } else {
      setFeedbackMsg({ id: eventId, text: res.error || 'Failed to delete event', isError: true });
    }
  };

  // POST /api/coordinator/shifts
  const handleAddShift = async (eventId: number) => {
    setIsSubmitting(true);
    const res = await ApiClient.request('POST', '/api/coordinator/shifts', {
      event_id: eventId,
      title: newShiftTitle,
      capacity: newShiftCapacity,
      start_time: newShiftStartTime,
      end_time: newShiftEndTime,
      required_skills: newShiftSkills.split(',').map((s) => s.trim()),
      is_urgent: false,
    });
    setIsSubmitting(false);

    if (res.status === 201 || res.status === 200) {
      setAddingShiftEventId(null);
      onDataChanged();
      setFeedbackMsg({ text: '✓ New shift added to event!' });
    } else {
      setFeedbackMsg({ id: eventId, text: res.error || 'Failed to add shift', isError: true });
    }
  };

  return (
    <div className="space-y-3.5 font-mono">
      {/* High Density Bar */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              EVENT & SHIFT OPERATIONS BUILDER
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              {events.length} EVENTS REGISTERED
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure volunteer events, Haversine GPS geofences (§6.3), and required competencies.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded border border-indigo-400/40 shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>NEW EVENT & SHIFT</span>
        </button>
      </div>

      {feedbackMsg && !feedbackMsg.id && (
        <div className={`p-2 rounded text-xs border ${
          feedbackMsg.isError ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
        }`}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {events.map((event) => {
          const eventShifts = shifts.filter((s) => s.event_id === event.id);
          const isDeleting = deletingId === event.id;
          const isAddingShift = addingShiftEventId === event.id;

          return (
            <div
              key={event.id}
              className="bg-[#1e293b] border border-slate-700 rounded-lg p-3.5 space-y-3 hover:border-slate-600 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-indigo-400 border border-slate-700 uppercase">
                        {event.category}
                      </span>
                      <h3 className="text-xs font-bold text-white">{event.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                      <Compass className="w-3 h-3" />
                      {event.geofence_radius}m
                    </span>
                    {/* PATCH /api/coordinator/events/{id} */}
                    <button
                      onClick={() => openEditModal(event)}
                      className="p-1 rounded bg-slate-800 hover:bg-indigo-900 text-slate-300 hover:text-indigo-300 border border-slate-700 transition-colors"
                      title="Edit Event (PATCH)"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {/* DELETE /api/coordinator/events/{id} */}
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      disabled={isDeleting}
                      className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors"
                      title="Delete Event (DELETE)"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin text-rose-400" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2">{event.description}</p>

                <div className="space-y-1 text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>{event.start_date} to {event.end_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">{event.venue_name} • {event.venue_address}</span>
                  </div>
                </div>

                {/* Shifts inside this event */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      CONFIGURED SHIFTS ({eventShifts.length}):
                    </span>
                    <button
                      onClick={() => setAddingShiftEventId(isAddingShift ? null : event.id)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Shift
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {eventShifts.map((s) => (
                      <div
                        key={s.id}
                        className="bg-slate-900/80 p-2 rounded border border-slate-800 flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{s.title}</div>
                          <div className="text-[10px] text-slate-400">
                            {s.start_time.substring(11, 16)} - {s.end_time.substring(11, 16)} • {s.capacity} MAX CAPACITY
                          </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {s.required_skills.length} SKILLS
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Standalone Add Shift Form */}
                {isAddingShift && (
                  <div className="bg-slate-900 p-2.5 rounded border border-indigo-500/30 space-y-2 mt-2">
                    <div className="text-[10px] font-bold text-indigo-400">ADD SHIFT TO EVENT #{event.id}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        value={newShiftTitle}
                        onChange={(e) => setNewShiftTitle(e.target.value)}
                        placeholder="Shift Title"
                        className="bg-slate-950 p-1.5 rounded border border-slate-700 text-slate-200"
                      />
                      <input
                        type="number"
                        value={newShiftCapacity}
                        onChange={(e) => setNewShiftCapacity(parseInt(e.target.value))}
                        placeholder="Capacity"
                        className="bg-slate-950 p-1.5 rounded border border-slate-700 text-slate-200"
                      />
                    </div>
                    <input
                      type="text"
                      value={newShiftSkills}
                      onChange={(e) => setNewShiftSkills(e.target.value)}
                      placeholder="Skills (comma-separated)"
                      className="w-full bg-slate-950 p-1.5 rounded border border-slate-700 text-xs text-slate-200"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddingShiftEventId(null)}
                        className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddShift(event.id)}
                        disabled={isSubmitting}
                        className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1"
                      >
                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Save Shift (POST /api/coordinator/shifts)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {feedbackMsg && feedbackMsg.id === event.id && (
                <div className={`p-1.5 rounded text-[10px] border ${
                  feedbackMsg.isError ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / Edit Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1e293b] border border-slate-700 rounded-lg w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in duration-200">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase">
                  {editingEvent ? `EDIT EVENT #${editingEvent.id} (PATCH)` : 'NEW VOLUNTEER EVENT & SHIFT (POST)'}
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-4 space-y-3 font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">EVENT TITLE:</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Autumn Community Food Drive"
                    className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">CATEGORY:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Food Distribution">Food Distribution</option>
                    <option value="Elderly Care">Elderly Care</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Disaster Relief">Disaster Relief</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">DESCRIPTION:</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details regarding duties, safety guidelines..."
                  className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Venue & Geofencing Parameters */}
              <div className="p-3 bg-slate-900 rounded border border-slate-700 space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" />
                  <span>HAVERSINE GPS GEOFENCE CONFIG (§6.3)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">VENUE NAME:</label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 text-xs p-1.5 rounded border border-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">VENUE ADDRESS:</label>
                    <input
                      type="text"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 text-xs p-1.5 rounded border border-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">LATITUDE:</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 text-slate-200 text-xs p-1.5 rounded border border-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">LONGITUDE:</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 text-slate-200 text-xs p-1.5 rounded border border-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">RADIUS (M):</label>
                    <input
                      type="number"
                      value={geofenceRadius}
                      onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                      className="w-full bg-slate-950 text-emerald-400 font-bold text-xs p-1.5 rounded border border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Shift Specs (only for new events) */}
              {!editingEvent && (
                <div className="p-3 bg-slate-900 rounded border border-slate-700 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-400">INITIAL SHIFT SPECIFICATIONS</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">SHIFT TITLE:</label>
                      <input
                        type="text"
                        value={shiftTitle}
                        onChange={(e) => setShiftTitle(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 text-xs p-1.5 rounded border border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">CAPACITY (VOLUNTEERS):</label>
                      <input
                        type="number"
                        value={shiftCapacity}
                        onChange={(e) => setShiftCapacity(parseInt(e.target.value))}
                        className="w-full bg-slate-950 text-slate-200 text-xs p-1.5 rounded border border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">REQUIRED SKILLS (COMMA-SEPARATED):</label>
                    <input
                      type="text"
                      value={requiredSkills}
                      onChange={(e) => setRequiredSkills(e.target.value)}
                      className="w-full bg-slate-950 text-slate-200 text-xs p-1.5 rounded border border-slate-700"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded border border-slate-600"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded border border-indigo-400/40 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editingEvent ? 'SAVE CHANGES (PATCH)' : 'PUBLISH EVENT & SHIFT (POST)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
