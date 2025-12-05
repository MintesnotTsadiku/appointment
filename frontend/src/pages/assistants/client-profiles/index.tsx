import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Search, UserCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { ClientProfileCard } from '@/components/assistants/ClientProfileCard';
import { CreateClientProfileModal } from '@/components/assistants/modals/CreateClientProfileModal';
import { EditClientProfileModal } from '@/components/assistants/modals/EditClientProfileModal';
import { ClientProfileDetailModal } from '@/components/assistants/modals/ClientProfileDetailModal';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type { ClientProfile } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';

const ClientProfiles = () => {
  const navigate = useNavigate();
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadClientProfiles();
  }, []);

  const loadClientProfiles = async () => {
    try {
      setLoading(true);
      const response = await assistantAPI.clientProfile.list({
        page_length: 100,
        order_by: 'modified desc',
      });

      if (response.success && response.data) {
        setClientProfiles(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load client profiles');
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = clientProfiles.filter((profile) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        profile.full_name.toLowerCase().includes(query) ||
        profile.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div
      className="min-h-screen text-[var(--text-primary)] overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/assistants')}
                  className="p-1.5 lg:p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                </motion.button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary" />
                    <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <UserCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1
                      className="text-xl lg:text-2xl font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Client Profiles
                    </h1>
                    <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
                      Manage client profiles
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsCreateModalOpen(true)}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                <Plus className="relative z-10 w-4 h-4" />
                <span className="relative z-10">Create Client Profile</span>
              </motion.button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search client profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-default)',
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : filteredProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredProfiles.map((profile) => (
                  <ClientProfileCard
                    key={profile.name}
                    clientProfile={profile}
                    onClick={() => {
                      setSelectedClientId(profile.name);
                      setIsDetailModalOpen(true);
                    }}
                    onEdit={() => {
                      setSelectedClientId(profile.name);
                      setIsEditModalOpen(true);
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card
              className="p-12 text-center"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <UserCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">No client profiles found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Get started by creating your first client profile'}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
                  }}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Create Client Profile
                </button>
              )}
            </Card>
          )}
        </main>

        {/* Create Client Profile Modal */}
        <CreateClientProfileModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            loadClientProfiles();
          }}
        />

        {/* Edit Client Profile Modal */}
        <EditClientProfileModal
          clientId={selectedClientId}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedClientId(null);
          }}
          onSave={() => {
            loadClientProfiles();
          }}
        />

        {/* Client Profile Detail Modal */}
        <ClientProfileDetailModal
          clientId={selectedClientId}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedClientId(null);
          }}
          onEdit={() => {
            setIsDetailModalOpen(false);
            setIsEditModalOpen(true);
          }}
          onDelete={() => {
            loadClientProfiles();
          }}
        />
      </div>
    </div>
  );
};

export default ClientProfiles;

