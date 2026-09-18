import { useState, useEffect } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Loader2, 
  Info, 
  Users,
  Clock,
  Calendar,
  Video,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { Switch } from '@/components/switch';
import { cn } from '@/lib/utils';

interface CreateAppointmentGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Member {
  user: string;
  is_mandatory: boolean;
  provider_name?: string;
}

interface FormData {
  organizations: Array<{ name: string; organization_name: string }>;
  user_provider: { name: string; provider_name: string; user: string } | null;
  org_providers: Record<string, Array<{ name: string; provider_name: string; user: string }>>;
  individual_providers: Array<{ name: string; provider_name: string; user: string }>;
  google_calendars: Array<{ name: string }>;
  is_organization_user: boolean;
}

export const CreateAppointmentGroupModal = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: CreateAppointmentGroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [duration, setDuration] = useState('30');
  const [buffer, setBuffer] = useState('5');
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [meetProvider, setMeetProvider] = useState<'Custom' | 'Zoom' | 'Google Meet'>('Custom');
  const [meetLink, setMeetLink] = useState('');
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

  // Fetch form data
  const { data: formData, isLoading: loadingFormData } = useFrappeGetCall<{ message: FormData }>(
    'appointment.onboarding.get_appointment_group_form_data',
    undefined,
    'appointment-group-form-data',
    {
      revalidateOnFocus: false,
    }
  );

  const formDataResult = formData?.message;

  // Auto-select first calendar if available
  useEffect(() => {
    if (formDataResult?.google_calendars && formDataResult.google_calendars.length > 0 && !selectedCalendar) {
      setSelectedCalendar(formDataResult.google_calendars[0].name);
    }
  }, [formDataResult?.google_calendars, selectedCalendar]);

  // Auto-select organization if user has only one
  useEffect(() => {
    if (formDataResult?.organizations && formDataResult.organizations.length === 1 && !selectedOrganization) {
      setSelectedOrganization(formDataResult.organizations[0].name);
    }
  }, [formDataResult?.organizations, selectedOrganization]);

  // Get available providers based on organization selection
  const getAvailableProviders = () => {
    if (!formDataResult) return [];
    
    if (selectedOrganization && formDataResult.org_providers) {
      return formDataResult.org_providers[selectedOrganization] || [];
    } else if (formDataResult.individual_providers) {
      return formDataResult.individual_providers;
    } else if (formDataResult.user_provider) {
      return [{
        name: formDataResult.user_provider.name,
        provider_name: formDataResult.user_provider.provider_name,
        user: formDataResult.user_provider.user
      }];
    }
    return [];
  };

  const availableProviders = getAvailableProviders();

  const { call, loading } = useFrappePostCall('appointment.onboarding.create_appointment_group');

  const handleAddMember = (provider: { name: string; provider_name: string; user: string }) => {
    // Check if already added
    if (selectedMembers.some(m => m.user === provider.user)) {
      toast.error('Provider already added');
      return;
    }
    
    setSelectedMembers([...selectedMembers, {
      user: provider.user,
      is_mandatory: selectedMembers.length === 0, // First member is mandatory by default
      provider_name: provider.provider_name
    }]);
  };

  const handleRemoveMember = (user: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.user !== user));
  };

  const handleToggleMandatory = (user: string) => {
    setSelectedMembers(selectedMembers.map(m => 
      m.user === user ? { ...m, is_mandatory: !m.is_mandatory } : m
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!groupName || groupName.trim().length < 3) {
      newErrors.groupName = 'Group name must be at least 3 characters';
    }
    if (!selectedCalendar) {
      newErrors.calendar = 'Please select a Google Calendar';
    }
    if (selectedMembers.length === 0) {
      newErrors.members = 'Please add at least one member';
    }
    if (selectedMembers.filter(m => m.is_mandatory).length === 0) {
      newErrors.members = 'At least one member must be mandatory';
    }
    if (!duration || parseInt(duration) < 5) {
      newErrors.duration = 'Duration must be at least 5 minutes';
    }
    if (meetProvider === 'Custom' && !meetLink) {
      newErrors.meetLink = 'Meeting link is required for Custom provider';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      const result = await call({
        group_name: groupName.trim(),
        duration_minutes: parseInt(duration),
        buffer_minutes: parseInt(buffer),
        event_creator: selectedCalendar,
        members: selectedMembers.map(m => ({
          user: m.user,
          is_mandatory: m.is_mandatory
        })),
        meet_provider: meetProvider,
        meet_link: meetProvider === 'Custom' ? meetLink : undefined,
        allow_rescheduling: allowRescheduling ? 1 : 0,
        minimum_notice_for_reschedule_hours: 2,
        minimum_notice_before_event_days: 1,
        event_availability_window_days: 30
      });

      if (result?.message?.success) {
        toast.success('Appointment Group created successfully!', {
          description: `Booking URL: /schedule/gr/${result.message.appointment_group.name}`,
          duration: 5000,
        });
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setGroupName('');
        setDuration('30');
        setBuffer('5');
        setSelectedMembers([]);
        setMeetLink('');
        setErrors({});
      } else {
        toast.error('Failed to create appointment group', {
          description: result?.message?.error || 'Please try again',
        });
        setErrors({ submit: result?.message?.error || 'Failed to create appointment group' });
      }
    } catch (error: any) {
      console.error('Failed to create appointment group:', error);
      toast.error('Failed to create appointment group', {
        description: error?.message || 'Please try again',
      });
      setErrors({ submit: error?.message || 'Failed to create appointment group. Please try again.' });
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl backdrop-blur-xl shadow-2xl"
              style={{ 
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)'
              }}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <div>
                  <h2 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Create Group Meeting
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Set up a meeting that requires multiple people to attend
                  </p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Group Name */}
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-base font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Group Name <span style={{ color: 'var(--accent-primary)' }}>*</span>
                  </Label>
                  <Input
                    id="groupName"
                    type="text"
                    placeholder="e.g., Team Consultation, Group Meeting"
                    value={groupName}
                    onChange={(e) => {
                      setGroupName(e.target.value);
                      if (errors.groupName) setErrors({ ...errors, groupName: '' });
                    }}
                    onFocus={() => setActiveField('groupName')}
                    onBlur={() => setActiveField(null)}
                    disabled={loading}
                    className={cn(
                      "h-12 text-base backdrop-blur-sm transition-all",
                      errors.groupName && "border-red-500"
                    )}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: `1px solid ${errors.groupName ? 'var(--accent-primary)' : activeField === 'groupName' ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    }}
                  />
                  {errors.groupName && (
                    <p className="text-sm flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                      <AlertCircle className="w-4 h-4" />
                      {errors.groupName}
                    </p>
                  )}
                </div>

                {/* Organization Selection (if user has organizations) */}
                {formDataResult?.organizations && formDataResult.organizations.length > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="organization" className="text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Organization <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                    </Label>
                    <Select
                      value={selectedOrganization}
                      onValueChange={(value) => {
                        setSelectedOrganization(value);
                        setSelectedMembers([]); // Clear members when org changes
                      }}
                    >
                      <SelectTrigger 
                        className="h-12 backdrop-blur-sm"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {formDataResult.organizations.map((org) => (
                          <SelectItem key={org.name} value={org.name}>
                            {org.organization_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Google Calendar */}
                <div className="space-y-2">
                  <Label htmlFor="calendar" className="text-base font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Google Calendar <span style={{ color: 'var(--accent-primary)' }}>*</span>
                  </Label>
                  {loadingFormData ? (
                    <div className="h-12 flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem' }}
                    >
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  ) : (
                    <Select
                      value={selectedCalendar}
                      onValueChange={(value) => {
                        setSelectedCalendar(value);
                        if (errors.calendar) setErrors({ ...errors, calendar: '' });
                      }}
                    >
                      <SelectTrigger 
                        className="h-12 backdrop-blur-sm"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: `1px solid ${errors.calendar ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                        }}
                      >
                        <SelectValue placeholder="Select Google Calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        {formDataResult?.google_calendars?.map((cal) => (
                          <SelectItem key={cal.name} value={cal.name}>
                            {cal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.calendar && (
                    <p className="text-sm flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                      <AlertCircle className="w-4 h-4" />
                      {errors.calendar}
                    </p>
                  )}
                  {!formDataResult?.google_calendars || formDataResult.google_calendars.length === 0 ? (
                    <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <Info className="w-4 h-4" />
                      No Google Calendar found. Please create one first.
                    </p>
                  ) : null}
                </div>

                {/* Duration and Buffer */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Duration (minutes) <span style={{ color: 'var(--accent-primary)' }}>*</span>
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      placeholder="30"
                      value={duration}
                      onChange={(e) => {
                        setDuration(e.target.value);
                        if (errors.duration) setErrors({ ...errors, duration: '' });
                      }}
                      disabled={loading}
                      className={cn(
                        "h-12 text-base backdrop-blur-sm",
                        errors.duration && "border-red-500"
                      )}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: `1px solid ${errors.duration ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      }}
                    />
                    {errors.duration && (
                      <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                        {errors.duration}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buffer" className="text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Buffer Time (minutes)
                    </Label>
                    <Input
                      id="buffer"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={buffer}
                      onChange={(e) => setBuffer(e.target.value)}
                      disabled={loading}
                      className="h-12 text-base backdrop-blur-sm"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                      }}
                    />
                  </div>
                </div>

                {/* Members */}
                <div className="space-y-2">
                  <Label className="text-base font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Members <span style={{ color: 'var(--accent-primary)' }}>*</span>
                  </Label>
                  
                  {/* Add Member */}
                  {availableProviders.length > 0 && (
                    <Select
                      onValueChange={(value) => {
                        const provider = availableProviders.find(p => p.user === value);
                        if (provider) handleAddMember(provider);
                      }}
                    >
                      <SelectTrigger 
                        className="h-12 backdrop-blur-sm"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <SelectValue placeholder="Add a member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders
                          .filter(p => !selectedMembers.some(m => m.user === p.user))
                          .map((provider) => (
                            <SelectItem key={provider.user} value={provider.user}>
                              {provider.provider_name} ({provider.user})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Selected Members */}
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {selectedMembers.map((member) => (
                        <div
                          key={member.user}
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                            <div>
                              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {member.provider_name || member.user}
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {member.user}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={member.is_mandatory}
                                onCheckedChange={() => handleToggleMandatory(member.user)}
                              />
                              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Mandatory
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.user)}
                              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.members && (
                    <p className="text-sm flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                      <AlertCircle className="w-4 h-4" />
                      {errors.members}
                    </p>
                  )}
                  {availableProviders.length === 0 && (
                    <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <Info className="w-4 h-4" />
                      No providers available. Please add providers first.
                    </p>
                  )}
                </div>

                {/* Meeting Provider */}
                <div className="space-y-2">
                  <Label className="text-base font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Meeting Provider
                  </Label>
                  <Select
                    value={meetProvider}
                    onValueChange={(value: 'Custom' | 'Zoom' | 'Google Meet') => setMeetProvider(value)}
                  >
                    <SelectTrigger 
                      className="h-12 backdrop-blur-sm"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Custom">Custom</SelectItem>
                      <SelectItem value="Zoom">Zoom</SelectItem>
                      <SelectItem value="Google Meet">Google Meet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Meeting Link (if Custom) */}
                {meetProvider === 'Custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="meetLink" className="text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Meeting Link <span style={{ color: 'var(--accent-primary)' }}>*</span>
                    </Label>
                    <Input
                      id="meetLink"
                      type="url"
                      placeholder="https://meet.example.com/group-meeting"
                      value={meetLink}
                      onChange={(e) => {
                        setMeetLink(e.target.value);
                        if (errors.meetLink) setErrors({ ...errors, meetLink: '' });
                      }}
                      disabled={loading}
                      className={cn(
                        "h-12 text-base backdrop-blur-sm",
                        errors.meetLink && "border-red-500"
                      )}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: `1px solid ${errors.meetLink ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      }}
                    />
                    {errors.meetLink && (
                      <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                        {errors.meetLink}
                      </p>
                    )}
                  </div>
                )}

                {/* Allow Rescheduling */}
                <div className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div>
                    <Label className="text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Allow Rescheduling
                    </Label>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Let customers reschedule their bookings
                    </p>
                  </div>
                  <Switch
                    checked={allowRescheduling}
                    onCheckedChange={setAllowRescheduling}
                  />
                </div>

                {/* Error Message */}
                {errors.submit && (
                  <div className="p-4 rounded-lg flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--accent-primary)',
                    }}
                  >
                    <AlertCircle className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                      {errors.submit}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="backdrop-blur-sm"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="backdrop-blur-sm shadow-lg"
                    style={{
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      color: 'white',
                      border: '1px solid transparent'
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Create Group Meeting
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};




