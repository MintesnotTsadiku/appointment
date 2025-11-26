import { useState } from 'react';
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
    'frappe_appointment.onboarding.get_provider_services',
    undefined,
    'provider-services'
  );

  const { call: deleteService, loading: deleting } = useFrappePostCall('frappe_appointment.onboarding.delete_service');

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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/home')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  Services & Appointment Types
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage your services and appointment types
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Service
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Info Card */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  About Services
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Services define what types of appointments you offer. Each service can have its own duration, 
                  price, and availability. Create multiple services to offer different appointment types.
                </p>
              </div>
            </div>
          </Card>

          {/* Services List */}
          {isLoading ? (
            <Card className="p-12">
              <div className="flex items-center justify-center">
                <Spinner />
              </div>
            </Card>
          ) : services.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.name} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {service.service_name}
                      </h3>
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {service.description}
                        </p>
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          {formatDuration(service.duration)}
                        </div>
                        {service.price > 0 && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <DollarSign className="w-4 h-4" />
                            {service.price} ETB
                          </div>
                        )}
                        {service.event_types.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {service.event_types.length} location{service.event_types.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/settings/services/${service.name}`)}
                        title="Edit service"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(service)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-700"
                        title="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No services created yet
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Service
                </Button>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          {services.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Set Availability
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Configure when services are available
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/settings/availability')}
                  >
                    Edit
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Add Location
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Link services to locations
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/settings/location')}
                  >
                    Add
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

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
