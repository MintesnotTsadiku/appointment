import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Save,
  LogOut,
  Camera,
  Edit2,
  X,
  FileText
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useFrappeGetCall, useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { PolicyManager } from './components/PolicyManager';

type TabType = 'profile' | 'policies';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, logout } = useFrappeAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize active tab from URL parameter or default to 'profile'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabParam === 'policies' ? 'policies' : 'profile') as TabType
  );
  
  // Update tab when URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'policies') {
      setActiveTab('policies');
    } else if (tabParam === null || tabParam === 'profile') {
      setActiveTab('profile');
    }
  }, [searchParams]);
  
  // Fetch user data
  const { data: userData, mutate: refetchUser } = useFrappeGetCall<{ 
    message: { 
      full_name: string;
      email: string;
      user_image?: string;
    } 
  }>(
    'frappe.auth.get_logged_user',
    undefined,
    'user-info'
  );

  // Fetch provider data (may fail for organization owners)
  const { data: providerData, mutate: refetchProvider, error: providerError } = useFrappeGetCall<{
    message: {
      name: string;
      provider_name: string;
      full_name: string;
      email: string;
      phone?: string;
      bio?: string;
      timezone: string;
      language: string;
      business_type?: string;
      profile_photo?: string;
      organization?: string;
      organization_name?: string;
    }
  }>(
    'appointment.onboarding.get_provider_profile',
    undefined,
    'provider-profile'
  );

  // Fetch organization data for organization owners
  const { data: hierarchyData } = useFrappeGetCall<{
    message: {
      user_type: 'organization_owner' | 'organization_member' | 'individual' | 'none';
      organization?: {
        name: string;
        organization_name: string;
      };
      organizations?: Array<{
        name: string;
        organization_name: string;
      }>;
    }
  }>(
    'appointment.api.manage.get_management_hierarchy',
    undefined,
    'management-hierarchy'
  );

  // Determine user type and entity ID
  const isOrganizationOwner = hierarchyData?.message?.user_type === 'organization_owner' || 
                               hierarchyData?.message?.user_type === 'organization_member';
  const organization = hierarchyData?.message?.organization || 
                       (hierarchyData?.message?.organizations && hierarchyData.message.organizations[0]);
  const organizationId = organization?.name;
  const isProvider = !providerError && providerData?.message?.name;
  const providerId = providerData?.message?.name;

  const { call: updateProfile } = useFrappePostCall('appointment.onboarding.update_provider_profile');

  // Form state
  const [formData, setFormData] = useState({
    provider_name: '',
    full_name: '',
    phone: '',
    bio: '',
    timezone: 'Africa/Addis_Ababa',
    language: 'en',
    business_type: 'clinic',
  });

  // Initialize form data when provider data loads
  useEffect(() => {
    if (providerData?.message) {
      const data = providerData.message;
      setFormData({
        provider_name: data.provider_name || '',
        full_name: data.full_name || '',
        phone: data.phone || '',
        bio: data.bio || '',
        timezone: data.timezone || 'Africa/Addis_Ababa',
        language: data.language || 'en',
        business_type: data.business_type || 'clinic',
      });
    }
  }, [providerData]);

  const businessTypes = [
    { value: 'clinic', label: 'Clinic/Hospital' },
    { value: 'salon', label: 'Salon/Spa' },
    { value: 'university', label: 'University/School' },
    { value: 'legal', label: 'Legal/Consulting' },
    { value: 'other', label: 'Other' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'am', label: 'አማርኛ (Amharic)' },
  ];

  const timezones = [
    { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'Europe/London', label: 'London (GMT)' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      refetchProvider();
      refetchUser();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  const userName = userData?.message?.full_name || currentUser || 'User';
  const userEmail = userData?.message?.email || currentUser || '';
  const profilePhoto = providerData?.message?.profile_photo || userData?.message?.user_image;
  const orgName = organization?.organization_name;

  return (
    <div 
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute top-1/3 -left-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header 
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/home')}
                  className="p-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div 
                      className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                    />
                    <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Profile Settings
                      <span 
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                        style={{ 
                          background: 'var(--accent-primary-light)',
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--accent-primary-light)'
                        }}
                      >
                        PRO
                      </span>
                    </h1>
                    <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Manage your profile information
                    </p>
                  </div>
                </div>
              </div>
              {!isEditing && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </motion.button>
              )}
            </div>
          </div>
        </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </div>
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'policies'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Policies
              </div>
            </button>
          </nav>
        </div>

        <div className="space-y-6">
          {activeTab === 'profile' && (
            <>
          {/* Show message for organization owners without provider profile */}
          {isOrganizationOwner && !isProvider && (
            <Card className="p-6 mb-6">
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400">
                  You are managing <strong>{orgName}</strong> as an organization owner.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Profile settings are available for individual providers. Use the Policies tab to manage organization policies.
                </p>
              </div>
            </Card>
          )}

          {/* Profile Photo Section - Only show if provider data exists */}
          {isProvider && (
          <Card className="p-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt={userName}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {userName}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {userEmail}
                </p>
                {(providerData?.message?.organization || orgName) && (
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2">
                    Organization: {orgName || providerData?.message?.organization_name || providerData?.message?.organization}
                  </p>
                )}
              </div>
            </div>
          </Card>
          )}

          {/* Profile Information - Only show if provider data exists */}
          {isProvider && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Profile Information
            </h3>
            
            <div className="space-y-6">
              {/* Provider Name */}
              <div className="space-y-2">
                <Label htmlFor="provider_name">
                  Provider Name <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="provider_name"
                    value={formData.provider_name}
                    onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                    placeholder="e.g., Dr. John Doe"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">
                    {providerData?.message?.provider_name || 'Not set'}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Full legal name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">
                    {providerData?.message?.full_name || 'Not set'}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 911 234 567"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">
                    {providerData?.message?.phone || 'Not set'}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio / Description</Label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">
                    {providerData?.message?.bio || 'No bio added'}
                  </p>
                )}
              </div>

              {/* Business Type */}
              <div className="space-y-2">
                <Label htmlFor="business_type">Business Type</Label>
                {isEditing ? (
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">
                    {businessTypes.find(t => t.value === providerData?.message?.business_type)?.label || 'Not set'}
                  </p>
                )}
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Timezone
                </Label>
                {isEditing ? (
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">
                    {timezones.find(tz => tz.value === providerData?.message?.timezone)?.label || providerData?.message?.timezone || 'Not set'}
                  </p>
                )}
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Language
                </Label>
                {isEditing ? (
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">
                    {languages.find(l => l.value === providerData?.message?.language)?.label || 'Not set'}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    if (providerData?.message) {
                      const data = providerData.message;
                      setFormData({
                        provider_name: data.provider_name || '',
                        full_name: data.full_name || '',
                        phone: data.phone || '',
                        bio: data.bio || '',
                        timezone: data.timezone || 'Africa/Addis_Ababa',
                        language: data.language || 'en',
                        business_type: data.business_type || 'clinic',
                      });
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </Card>
          )}

          {/* Danger Zone */}
          <Card className="p-6 border-red-200 dark:border-red-900">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              Danger Zone
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Logout</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Sign out of your account
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </Card>
            </>
          )}

          {activeTab === 'policies' && (
            <>
              {isProvider && providerId && (
                <PolicyManager
                  userType="provider"
                  entityId={providerId}
                />
              )}
              {isOrganizationOwner && organizationId && (
                <PolicyManager
                  userType="organization"
                  entityId={organizationId}
                />
              )}
              {!isProvider && !isOrganizationOwner && (
                <Card className="p-6">
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      Please complete onboarding to manage policies.
                    </p>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      </div>
    </div>
  );
};

export default Profile;

