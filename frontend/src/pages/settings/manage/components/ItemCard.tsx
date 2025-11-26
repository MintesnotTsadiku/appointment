/**
 * Item Card Component
 * Displays an item (Service, Location, Provider, EventType) with validation and actions
 */

import { Edit, Trash2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/button';
import { ValidationBadge } from './ValidationBadge';

interface ItemCardProps {
  type: 'service' | 'location' | 'provider' | 'event_type';
  item: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  nested?: boolean;
  children?: React.ReactNode;
}

export const ItemCard = ({ type, item, onEdit, onDelete, onRefresh, nested = false, children }: ItemCardProps) => {
  const getItemName = () => {
    switch (type) {
      case 'service':
        return item.service_name;
      case 'location':
        return item.location_name;
      case 'provider':
        return item.provider_name;
      case 'event_type':
        return item.event_type_name;
      default:
        return 'Unknown';
    }
  };

  const getItemDescription = () => {
    switch (type) {
      case 'service':
        return item.description || `${item.duration} min • ${item.price} ${item.currency || 'ETB'}`;
      case 'location':
        return item.address || 'No address set';
      case 'provider':
        return item.email || 'No email';
      case 'event_type':
        return item.description || 'No description';
      default:
        return '';
    }
  };

  const validation = item.validation || { status: 'complete', issues: [] };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${nested ? 'ml-4' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {getItemName()}
            </h3>
            <ValidationBadge status={validation.status} size="sm" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {getItemDescription()}
          </p>
          
          {validation.issues && validation.issues.length > 0 && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
              {validation.issues.join(', ')}
            </div>
          )}

          {/* Booking URLs for Provider */}
          {type === 'provider' && item.booking_urls && item.booking_urls.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 mb-1">
                <LinkIcon className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Booking URLs:</span>
              </div>
              <div className="space-y-1">
                {item.booking_urls.map((url: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <a
                      href={url.full_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      {url.description || url.url_type || url.full_url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {children}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              title="Delete"
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

