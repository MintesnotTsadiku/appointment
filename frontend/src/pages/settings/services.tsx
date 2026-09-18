import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Calendar, Clock, DollarSign, Edit2, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { CreateServiceModal } from '@/pages/home/modals/CreateServiceModal';
import Spinner from '@/components/spinner';

interface Service {
  name: string;
  service_name: string;
  description: string;
  duration: number;
  price: number;
  buffer_before: number;
  buffer_after: number;
  event_types: Array<{
    name: string;
    event_type_name: string;
    location: string;
  }>;
}

const ServicesSettings = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, mutate } = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.onboarding.get_provider_services',
    undefined,
    'provider-services'
  );

  const { call: deleteService, loading: deleting } = useFrappePostCall('appointment.onboarding.delete_service');

  const services = data?.message?.services || [];

  const handleDelete = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.service_name}"? This will also delete all associated appointment types.`)) {
      return;
    }

    try {
      await deleteService({ service_name: service.service_name });
      mutate();
    } catch (error: any) {
      alert(error?.message || 'Failed to delete service. Please try again.');
    }
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes || isNaN(minutes) || minutes <= 0) return 'Not set';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

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
        <div
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/home')}
                  className="p-1.5 lg:p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                </motion.button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                    />
                    <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      Services & Appointment Types
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
                      Manage your services and appointment types
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                <Plus className="relative z-10 w-4 h-4" />
                <span className="relative z-10">New Service</span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                className="p-6 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-primary-light)'
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="inline-flex p-2 rounded-lg bg-gradient-primary">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      About Services
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Services define what types of appointments you offer. Each service can have its own duration, 
                      price, and availability. Create multiple services to offer different appointment types.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Services List */}
            {isLoading ? (
              <Card
                className="p-12 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="flex items-center justify-center">
                  <Spinner />
                </div>
              </Card>
            ) : services.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {services.map((service, index) => (
                    <motion.div
                      key={service.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
                      <Card
                        className="relative p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)'
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                              {service.service_name}
                            </h3>
                            {service.description && (
                              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                                {service.description}
                              </p>
                            )}
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                <Clock className="w-4 h-4" />
                                {formatDuration(service.duration || 0)}
                              </div>
                              {service.price > 0 && (
                                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                  <DollarSign className="w-4 h-4" />
                                  {service.price} ETB
                                </div>
                              )}
                              {service.event_types && service.event_types.length > 0 && (
                                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                  <MapPin className="w-4 h-4" />
                                  {service.event_types.length} location{service.event_types.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => service.name && navigate(`/settings/services/${service.name}`)}
                              className="p-2 rounded-lg transition-colors"
                              style={{
                                backgroundColor: 'var(--border-subtle)',
                                color: 'var(--text-muted)'
                              }}
                              title="Edit service"
                            >
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(service)}
                              disabled={deleting}
                              className="p-2 rounded-lg transition-colors"
                              style={{
                                backgroundColor: 'var(--border-subtle)',
                                color: 'var(--accent-secondary)'
                              }}
                              title="Delete service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="p-6 backdrop-blur-sm"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-primary mb-4">
                      <Calendar className="w-16 h-16 text-white" />
                    </div>
                    <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                      No services created yet
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCreateModal(true)}
                      className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden mx-auto"
                    >
                      <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                      <Plus className="relative z-10 w-4 h-4" />
                      <span className="relative z-10">Create Your First Service</span>
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Quick Actions */}
            {services && services.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card
                    className="p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)'
                    }}
                    onClick={() => navigate('/settings/availability')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Set Availability
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Configure when services are available
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--border-subtle)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        Edit
                      </motion.button>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card
                    className="p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)'
                    }}
                    onClick={() => navigate('/settings/location')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Add Location
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Link services to locations
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--border-subtle)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        Add
                      </motion.button>
                    </div>
                  </Card>
                </motion.div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Service Modal */}
      <CreateServiceModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          mutate();
        }}
      />
    </div>
  );
};

export default ServicesSettings;
