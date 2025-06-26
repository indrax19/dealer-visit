
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

const SubmitReport = () => {
  const [date, setDate] = useState<Date>();
  const [dealerName, setDealerName] = useState('');
  const [visitType, setVisitType] = useState('');
  const [notes, setNotes] = useState('');
  const [issues, setIssues] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { currentUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to submit a report');
      return;
    }

    if (!date || !dealerName || !visitType || !notes) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Create a visit report entry in the snapshots table for now
      // In a real application, you'd want a separate visit_reports table
      const visitData = {
        visit_date: date.toISOString(),
        dealer_name: dealerName,
        visit_type: visitType,
        notes,
        issues,
        follow_up_required: followUpRequired,
        submitted_by: currentUser.id,
        submitted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('snapshots')
        .insert({
          snapshot_type: 'manual',
          active_data: [visitData],
          expired_data: [],
          total_active: 0,
          total_expired: 0,
          total_dealers: 1,
        });

      if (error) throw error;

      toast.success('Visit report submitted successfully!');
      
      // Reset form
      setDate(undefined);
      setDealerName('');
      setVisitType('');
      setNotes('');
      setIssues('');
      setFollowUpRequired(false);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Visit Report</h1>
        <p className="text-gray-600">Document your dealer visits and findings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Visit Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealer">Dealer Name *</Label>
                <Input
                  id="dealer"
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  placeholder="Enter dealer name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitType">Visit Type *</Label>
              <Input
                id="visitType"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                placeholder="e.g., Routine Check, Technical Support, Training"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Visit Notes *</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what was accomplished during the visit..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issues">Issues Identified</Label>
              <Textarea
                id="issues"
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                placeholder="Describe any issues or concerns identified..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="followUp"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <Label htmlFor="followUp">Follow-up visit required</Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitReport;
