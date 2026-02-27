import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Upload, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getAvatarUrl } from '../utils/avatar';
import axios from 'axios';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user, token, updateUser, API } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    sharing_code: user?.sharing_code || ''
  });
  const [selectedDate, setSelectedDate] = useState(
    user?.last_relapse_datetime ? new Date(user.last_relapse_datetime) : new Date()
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [updatingSharingCode, setUpdatingSharingCode] = useState(false);
  const [updatingRelapse, setUpdatingRelapse] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingStreak, setResettingStreak] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        toast.error('Only JPG and PNG files are allowed');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      toast.error('Please select a file first');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', avatarFile);

    setUploadingAvatar(true);
    try {
      const response = await axios.post(`${API}/users/upload-avatar`, formDataUpload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update user context with new avatar
      updateUser({ avatar_url: response.data.avatar_url });
      
      // Clear preview and file
      setAvatarFile(null);
      setAvatarPreview(null);
      
      toast.success('Profile photo updated');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar_url) {
      toast.error('No profile photo to remove');
      return;
    }

    setRemovingAvatar(true);
    try {
      await axios.put(`${API}/users/profile`, 
        { 
          sharing_code: user.sharing_code || null,
          remove_avatar: true 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update user context to remove avatar
      updateUser({ avatar_url: null });
      
      toast.success('Profile photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleUpdateSharingCode = async () => {
    setUpdatingSharingCode(true);
    try {
      await axios.put(`${API}/users/profile`, 
        { sharing_code: formData.sharing_code || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser({ sharing_code: formData.sharing_code });
      toast.success('Sharing code saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update sharing code');
    } finally {
      setUpdatingSharingCode(false);
    }
  };

  const handleUpdateRelapse = async () => {
    if (!selectedDate) {
      toast.error('Please select a date and time');
      return;
    }

    // Validate not future date
    if (selectedDate > new Date()) {
      toast.error('Cannot select a future date');
      return;
    }

    setUpdatingRelapse(true);
    try {
      const utcDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
      await axios.put(`${API}/users/relapse`,
        { last_relapse_datetime: utcDate.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser({ last_relapse_datetime: utcDate.toISOString() });
      toast.success('Streak start updated');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update streak start');
    } finally {
      setUpdatingRelapse(false);
    }
  };

  const handleResetStreak = async () => {
    setResettingStreak(true);
    try {
      const now = new Date();
      await axios.put(`${API}/users/relapse`,
        { last_relapse_datetime: now.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser({ last_relapse_datetime: now.toISOString() });
      setSelectedDate(now);
      toast.success('Streak reset successfully');
      setShowResetConfirm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset streak');
    } finally {
      setResettingStreak(false);
    }
  };

  const formatMemberSince = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
          data-testid="back-to-leaderboard-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="p-8 border-b border-border">
            <h1 className="text-3xl font-bold uppercase tracking-wide mb-6 text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Settings
            </h1>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Profile</h2>
              
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={avatarPreview || getAvatarUrl(user?.username, user?.avatar_url)}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                    data-testid="settings-avatar-preview"
                  />
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{user?.username}</h3>
                  <p className="text-sm" style={{ color: '#808080' }}>{user?.email}</p>
                  <p className="text-sm" style={{ color: '#B3B3B3' }}>
                    Member since {formatMemberSince(user?.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="p-8 space-y-8">
            {/* Avatar Upload Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Profile Photo</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                    data-testid="avatar-upload-input"
                  />
                  <label htmlFor="avatar-upload">
                    <Button 
                      variant="outline" 
                      as="span" 
                      className="cursor-pointer" 
                      data-testid="select-avatar-btn"
                      disabled={uploadingAvatar}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </label>
                  
                  {avatarFile && (
                    <Button
                      onClick={handleUploadAvatar}
                      disabled={uploadingAvatar}
                      data-testid="upload-avatar-btn"
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                  )}

                  {user?.avatar_url && !avatarFile && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveAvatar}
                      disabled={removingAvatar}
                      data-testid="remove-avatar-btn"
                      style={{ borderColor: '#2A2A2A', color: '#B3B3B3' }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {removingAvatar ? 'Removing...' : 'Remove Photo'}
                    </Button>
                  )}
                </div>
                
                {avatarFile && (
                  <p className="text-sm" style={{ color: '#B3B3B3' }}>
                    Selected: {avatarFile.name}
                  </p>
                )}
                
                <p className="text-sm" style={{ color: '#808080' }}>
                  JPG or PNG. Max 10MB.
                </p>
              </div>
            </div>

            {/* Sharing Code Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Sharing Code</h2>
              <div className="space-y-3">
                <Label htmlFor="sharing_code" style={{ color: '#B3B3B3' }}>
                  Your Sharing Code (Optional)
                </Label>
                <Input
                  id="sharing_code"
                  type="text"
                  value={formData.sharing_code}
                  onChange={(e) => setFormData({ ...formData, sharing_code: e.target.value })}
                  placeholder="Enter a code to share with others"
                  data-testid="sharing-code-input"
                  disabled={updatingSharingCode}
                />
                <Button
                  onClick={handleUpdateSharingCode}
                  disabled={updatingSharingCode}
                  data-testid="update-sharing-code-btn"
                >
                  {updatingSharingCode ? 'Saving...' : 'Save Sharing Code'}
                </Button>
              </div>
            </div>

            {/* Relapse DateTime Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Update Streak Start</h2>
              <div className="space-y-3">
                <Label htmlFor="relapse_datetime" style={{ color: '#B3B3B3' }}>
                  Last Relapse Date & Time
                </Label>
                
                <div className="datepicker-wrapper">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="dd MMM yyyy, HH:mm"
                    maxDate={new Date()}
                    className="w-full px-4 py-2 rounded-md border text-white"
                    style={{
                      backgroundColor: '#121212',
                      borderColor: '#2A2A2A',
                      color: '#FFFFFF'
                    }}
                    calendarClassName="dark-datepicker"
                    data-testid="relapse-datetime-picker"
                  />
                </div>
                
                <p className="text-sm" style={{ color: '#B3B3B3' }}>
                  Set the date and time when your current streak started. Your streak timer will count from this moment.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleUpdateRelapse}
                    disabled={updatingRelapse}
                    data-testid="update-relapse-btn"
                  >
                    {updatingRelapse ? 'Updating...' : 'Update Streak Start'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={resettingStreak}
                    data-testid="reset-streak-btn"
                    style={{ borderColor: '#2A2A2A', color: '#B3B3B3' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Streak to Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom DatePicker Styles */}
      <style jsx global>{`
        .react-datepicker-wrapper {
          width: 100%;
        }

        .react-datepicker {
          background-color: #161616 !important;
          border: 1px solid #2A2A2A !important;
          border-radius: 8px !important;
          font-family: 'Manrope', sans-serif !important;
        }

        .react-datepicker__header {
          background-color: #1F1F1F !important;
          border-bottom: 1px solid #2A2A2A !important;
          border-radius: 8px 8px 0 0 !important;
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: #FFFFFF !important;
        }

        .react-datepicker__day {
          color: #B3B3B3 !important;
        }

        .react-datepicker__day:hover {
          background-color: #1F1F1F !important;
          color: #FFFFFF !important;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #F97316 !important;
          color: #FFFFFF !important;
        }

        .react-datepicker__day--disabled {
          color: #4A4A4A !important;
          cursor: not-allowed !important;
        }

        .react-datepicker__time-container {
          border-left: 1px solid #2A2A2A !important;
        }

        .react-datepicker__time {
          background-color: #161616 !important;
        }

        .react-datepicker__time-list-item {
          color: #B3B3B3 !important;
        }

        .react-datepicker__time-list-item:hover {
          background-color: #1F1F1F !important;
          color: #FFFFFF !important;
        }

        .react-datepicker__time-list-item--selected {
          background-color: #F97316 !important;
          color: #FFFFFF !important;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #B3B3B3 !important;
        }

        .react-datepicker__navigation:hover *::before {
          border-color: #FFFFFF !important;
        }

        .react-datepicker__input-container input {
          background-color: #121212 !important;
          border: 1px solid #2A2A2A !important;
          color: #FFFFFF !important;
          padding: 0.5rem 1rem !important;
          border-radius: 0.375rem !important;
          width: 100% !important;
        }

        .react-datepicker__input-container input:focus {
          outline: none !important;
          border-color: #F97316 !important;
          box-shadow: 0 0 0 1px #F97316 !important;
        }

        .react-datepicker__input-container input::placeholder {
          color: #6B7280 !important;
        }
      `}</style>

      {/* Reset Streak Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure you want to reset your streak to now?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#B3B3B3' }}>
              This will set your streak start time to the current moment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={resettingStreak}
              style={{ borderColor: '#2A2A2A', color: '#B3B3B3' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetStreak}
              disabled={resettingStreak}
              className="bg-primary text-white"
            >
              {resettingStreak ? 'Resetting...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
