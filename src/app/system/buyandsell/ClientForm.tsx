// buyandsell/ClientForm.tsx - Enhanced with Phone Validation and Keyboard Navigation
'use client';

import { useState, useRef } from 'react';
import { clientsApi, formatPhoneNumberForDisplay, cleanPhoneNumberForApi } from '@/lib/api';
import { 
  User,
  MapPin,
  Phone,
  RotateCcw,
  Search
} from 'lucide-react';
import { colors } from '@/lib/colors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getMessage, getClientFoundMessage } from '@/lib/messages';

// Use the API Client type directly to avoid conflicts
interface Client {
  cus_id?: number;
  cus_name: string; 
  address: string;
  phone_number: string;
}

interface FormData {
  cus_name: string;
  address: string;
  phone_number: string;
}

interface ClientFormProps {
  clients: Client[];
  onClientCreated: () => void;
  onNotification: (type: 'success' | 'error', message: string) => void;
  onClientFound: (client: Client | null) => void;
  onFormDataChange: (formData: FormData) => void;
  formData: FormData;
  foundClient: Client | null;
  onResetBothForms?: () => void;
}

export default function ClientForm({
  clients,
  onClientCreated,
  onNotification,
  onClientFound,
  onFormDataChange,
  formData,
  foundClient,
  onResetBothForms
}: ClientFormProps) {
  
  // Debug: Log current formData
  console.log('ClientForm: Current formData:', formData);
  console.log('ClientForm: Current foundClient:', foundClient);
  const [searching, setSearching] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');

  // Refs for keyboard navigation
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  // Function to calculate next ID from existing clients
  const getNextId = (): number => {
    if (clients.length === 0) return 1;
    const validIds = clients.map(client => client.cus_id).filter((id): id is number => id !== undefined);
    if (validIds.length === 0) return 1;
    const maxId = Math.max(...validIds);
    return maxId + 1;
  };

  // Simple Cambodian phone number validation based on digit count
  const validateCambodianPhone = (phone: string): { isValid: boolean; message: string; } => {
    // Remove all non-numeric characters for validation
    const cleanPhone = cleanPhoneNumberForApi(phone);
    
    // Check if empty
    if (!cleanPhone) {
      return { isValid: false, message: 'សូមបញ្ចូលលេខទូរសព្ទ' };
    }

    // Check length - Cambodian phones are typically 8-10 digits
    // Mobile: usually 9 digits
    // Landline: usually 8 digits  
    // Some variations: 7-10 digits to be flexible
    if (cleanPhone.length < 7 || cleanPhone.length > 10) {
      return { isValid: false, message: 'លេខទូរសព្ទត្រូវតែមាន ៧ ទៅ ១០ ខ្ទង់' };
    }

    return { isValid: true, message: '' };
  };

  // Use the centralized formatPhoneNumberForDisplay function

  const resetForm = () => {
    console.log('🔄 Resetting both forms');
    
    // Reset client form data
    onFormDataChange({ cus_name: '', address: '', phone_number: '' });
    onClientFound(null);
    setPhoneError('');
    
    // Reset order form as well if callback is provided
    if (onResetBothForms) {
      onResetBothForms();
    }

    // Focus on first input
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleSearchClient = async () => {
    console.log('Starting search with phone:', formData.phone_number);
    
    // Test phone number formatting with the current phone number
    const testPhone = '011733744';
    console.log(' Testing phone formatting:');
    console.log(' Original:', testPhone);
    console.log(' Formatted:', formatPhoneNumberForDisplay(testPhone));
    console.log(' Cleaned:', cleanPhoneNumberForApi(testPhone));
    
    if (!formData.phone_number?.trim()) {
      onNotification('error', getMessage('error', 'phoneRequiredForSearch'));
      return;
    }

    // Validate phone before searching
    const validation = validateCambodianPhone(formData.phone_number);
    if (!validation.isValid) {
      setPhoneError(validation.message);
      onNotification('error', validation.message);
      return;
    }

    setSearching(true);
    setPhoneError('');

    try {
      // Send only digits to API
      const cleanPhone = cleanPhoneNumberForApi(formData.phone_number);
      const response = await clientsApi.getByPhone(cleanPhone);
      console.log('Search response:', response);
      console.log('Search response.message:', response.message);
      
      console.log('Full API response structure:', JSON.stringify(response, null, 2));
      
      if (response.code === 200 && response.result) {
        // Handle both array and single object responses
        const apiClient = Array.isArray(response.result) ? response.result[0] : response.result;
        console.log('Client found:', apiClient);
        console.log('Client phone number:', apiClient.phone_number);
        console.log('Client name:', apiClient.cus_name);
        console.log('Client address:', apiClient.address);
        
        // Transform API client to component client format
        const client: Client = {
          cus_id: apiClient.cus_id,
          cus_name: apiClient.cus_name || '',
          address: apiClient.address || '',
          phone_number: apiClient.phone_number || ''
        };
        
        onClientFound(client);
        
        // Auto-fill the form with found client data
        const formattedPhone = formatPhoneNumberForDisplay(client.phone_number);
        console.log('Original phone from API:', client.phone_number);
        console.log('Formatted phone for display:', formattedPhone);
        
        const newFormData = {
          cus_name: client.cus_name || '',
          address: client.address || '',
          phone_number: formattedPhone || formData.phone_number
        };
        console.log('Setting form data to:', newFormData);
        console.log('Calling onFormDataChange with:', newFormData);
        onFormDataChange(newFormData);
        console.log('onFormDataChange called successfully');
        
        onNotification('success', getClientFoundMessage(client.cus_name));
      } else {
        console.log('No client found - API response:', response);
        console.log('Response code:', response.code);
        console.log('Response result:', response.result);
        console.log('Response message:', response.message);
        console.log('Using Khmer translation for no client found');
        const khmerMessage = getMessage('error', 'clientNotFound');
        console.log('Khmer message:', khmerMessage);
        onNotification('error', khmerMessage);
        onClientFound(null);
        
        // DON'T clear other fields - keep existing form data intact
        // Only update the phone number format if needed
        const newFormData = {
          cus_name: formData.cus_name, // Keep existing name
          address: formData.address,   // Keep existing address
          phone_number: formData.phone_number.trim() // Keep the searched phone
        };
        console.log('No client found - keeping existing form data:', newFormData);
        onFormDataChange(newFormData);
      }
    } catch (error: unknown) {
      console.error('Error searching client:', error);
      
      // Handle different error cases
      const apiError = error as { response?: { status?: number; data?: { message?: string } } };
      
      // Debug: Log the actual API error message
      console.log('API Error Response:', apiError.response?.data);
      console.log('API Error Message:', apiError.response?.data?.message);
      
      if (apiError.response?.status === 404) {
        console.log('Using Khmer translation for 404 error');
        onNotification('error', getMessage('error', 'clientNotFound'));
      } else if (apiError.response?.status === 400) {
        console.log('Using Khmer translation for 400 error');
        onNotification('error', getMessage('error', 'invalidPhone'));
      } else if (apiError.response?.status === 500) {
        console.log('Using Khmer translation for 500 error');
        onNotification('error', getMessage('error', 'serverError'));
      } else {
        console.log('Using Khmer translation for other error');
        // Always use our Khmer translation instead of API English messages
        onNotification('error', getMessage('error', 'clientSearchError'));
      }
      
      onClientFound(null);
      
      // DON'T clear other fields when there's an error - keep existing form data intact
      const newFormData = {
        cus_name: formData.cus_name, // Keep existing name
        address: formData.address,   // Keep existing address  
        phone_number: formData.phone_number.trim() // Keep the searched phone
      };
      console.log('Error: keeping existing form data:', newFormData);
      onFormDataChange(newFormData);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission started');
    console.log('Form data before validation:', formData);
    
    // Validate required fields
    if (!formData.cus_name?.trim()) {
      console.log('Validation failed: Missing customer name');
      onNotification('error', getMessage('error', 'customerNameRequired'));
      nameInputRef.current?.focus();
      return;
    }

    if (!formData.phone_number?.trim()) {
      console.log('Validation failed: Missing phone number');
      onNotification('error', getMessage('error', 'phoneNumberRequired'));
      phoneInputRef.current?.focus();
      return;
    }

    // Validate phone number
    const phoneValidation = validateCambodianPhone(formData.phone_number);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.message);
      onNotification('error', phoneValidation.message);
      phoneInputRef.current?.focus();
      return;
    }

    setPhoneError('');

    try {
      // Send clean phone number (digits only) to API
      const clientData = {
        cus_name: formData.cus_name.trim(),
        address: formData.address?.trim() || '',
        phone_number: cleanPhoneNumberForApi(formData.phone_number) // Send only digits
      };

      console.log('Sending client data to API:', clientData);

      const response = await clientsApi.create(clientData);
      console.log('API response:', response);
      
      if (response.code === 200) {
        onNotification('success', getMessage('success', 'clientCreated'));
        resetForm();
        onClientCreated();
      } else {
        console.log('API returned error:', response);
        // Always use our Khmer translation instead of API English messages
        onNotification('error', getMessage('error', 'clientSaveError'));
      }
    } catch (error: unknown) {
      console.error('Error saving client:', error);
      
      const apiError = error as { response?: { data?: { message?: string } } };
      // Always use our Khmer translation instead of API English messages
      onNotification('error', getMessage('error', 'clientSaveError'));
    }
  };

  // Handle phone number input change with validation
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow only numbers, spaces, dashes, dots, and parentheses for input
    // Remove all non-digit characters for processing
    const digitsOnly = cleanPhoneNumberForApi(value);
    
    // Limit to 10 digits maximum
    if (digitsOnly.length > 10) {
      return;
    }

    // Format for display with spaces
    const formattedPhone = formatPhoneNumberForDisplay(digitsOnly);
    
    console.log('📱 Phone input:', value);
    console.log('📱 Digits only:', digitsOnly);
    console.log('📱 Formatted for display:', formattedPhone);
    
    const newFormData = {
      ...formData, 
      phone_number: formattedPhone 
    };
    
    onFormDataChange(newFormData);
    
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError('');
    }

    // Real-time validation feedback
    if (digitsOnly.length >= 7) {
      const validation = validateCambodianPhone(digitsOnly);
      if (!validation.isValid) {
        setPhoneError(validation.message);
      } else {
        setPhoneError('');
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      switch (currentField) {
        case 'name':
          phoneInputRef.current?.focus();
          break;
        case 'phone':
          const validation = validateCambodianPhone(formData.phone_number);
          if (validation.isValid) {
            addressInputRef.current?.focus();
          }
          break;
        case 'address':
          // Focus will naturally move to the search button when user tabs
          break;
        default:
          break;
      }
    }

    // Arrow key navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      switch (currentField) {
        case 'name':
          phoneInputRef.current?.focus();
          break;
        case 'phone':
          addressInputRef.current?.focus();
          break;
        case 'address':
          // Focus will naturally move to the search button when user tabs
          break;
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      switch (currentField) {
        case 'phone':
          nameInputRef.current?.focus();
          break;
        case 'address':
          phoneInputRef.current?.focus();
          break;
        case 'search':
          addressInputRef.current?.focus();
          break;
      }
    }
  };

  return (
    <Card title="បំពេញអតិថិជនថ្មី" className="h-full flex flex-col">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          {/* Client ID */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: colors.secondary[700] }}
            >
              លេខសំគាល់
            </label>
            <div 
              className="px-3 py-2 border rounded-md text-left text-sm font-medium"
              style={{ 
                backgroundColor: colors.secondary[100],
                borderColor: colors.secondary[300],
                color: colors.secondary[600]
              }}
            >
              {foundClient ? (
                `រកឃើញ: ${foundClient.cus_id || 'N/A'}`
              ) : (
                `${getNextId()}`
              )}
            </div>
          </div>

          {/* Client Name */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: colors.secondary[700] }}
            >
              ឈ្មោះអតិថិជន
            </label>
            <div className="relative">
              <User 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.secondary[400] }}
              />
              <input
                ref={nameInputRef}
                type="text"
                value={formData.cus_name || ''}
                onChange={(e) => {
                  console.log('👤 Name changed to:', e.target.value);
                  onFormDataChange({ ...formData, cus_name: e.target.value });
                }}
                onKeyDown={(e) => handleKeyDown(e, 'name')}
                className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                style={{ 
                  borderColor: colors.secondary[300],
                  backgroundColor: foundClient ? colors.success[50] : 'white'
                }}
                placeholder={foundClient ? foundClient.cus_name : "បញ្ចូលឈ្មោះអតិថិជន"}
                required
              />
            </div>
          </div>

          {/* Phone Number with Search Button */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: colors.secondary[700] }}
            >
              លេខទូរសព្ទ
            </label>
            <div className="relative">
              <Phone 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.secondary[400] }}
              />
              <input
                ref={phoneInputRef}
                type="tel"
                value={formData.phone_number || ''}
                onChange={handlePhoneNumberChange}
                onKeyDown={(e) => handleKeyDown(e, 'phone')}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  phoneError ? 'border-red-500 ring-1 ring-red-500' : ''
                }`}
                style={{ 
                  borderColor: phoneError ? '#ef4444' : colors.secondary[300],
                  backgroundColor: foundClient ? colors.success[50] : 'white'
                }}
                placeholder="បញ្ចូលលេខទូរសព្ទ"
                inputMode="numeric"
                required
              />
            </div>
            {phoneError && (
              <p className="mt-1 text-xs text-red-600 flex items-center">
                <span className="mr-1">⚠️</span>
                {phoneError}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: colors.secondary[700] }}
            >
              អាសយដ្ឋាន
            </label>
            <div className="relative">
              <MapPin 
                className="absolute left-3 top-3 h-4 w-4"
                style={{ color: colors.secondary[400] }}
              />
              <textarea
                ref={addressInputRef}
                value={formData.address || ''}
                onChange={(e) => {
                  console.log('🏠 Address changed to:', e.target.value);
                  onFormDataChange({ ...formData, address: e.target.value });
                }}
                onKeyDown={(e) => handleKeyDown(e, 'address')}
                className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                style={{ 
                  borderColor: colors.secondary[300],
                  backgroundColor: foundClient ? colors.success[50] : 'white'
                }}
                placeholder="បញ្ចូលអាសយដ្ឋាន"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Pinned to bottom */}
        <div className="flex space-x-3 pt-6 mt-auto">          
          <Button
            type="button"
            onClick={handleSearchClient}
            loading={searching}
            disabled={searching || !formData.phone_number?.trim()}
            icon={<Search className="h-4 w-4" />}
            className='flex-1'
          >
            ស្វែងរក
          </Button>

          <Button
            type="button"
            onClick={resetForm}
            variant="secondary"
            icon={<RotateCcw className="h-4 w-4" />}
          >
            លុប
          </Button>
        </div>
      </form>
    </Card>
  );
}