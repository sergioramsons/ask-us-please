import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, CalendarDays, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BusinessDay {
  day: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

interface Holiday {
  id: string;
  name: string;
  date: Date;
}

const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const timeZones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "UTC"
];

export function BusinessHoursConfig() {
  const { toast } = useToast();
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [businessDays, setBusinessDays] = useState<BusinessDay[]>(
    daysOfWeek.map(day => ({
      day,
      enabled: day !== "Saturday" && day !== "Sunday",
      openTime: "09:00",
      closeTime: "17:00"
    }))
  );
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: undefined as Date | undefined });
  const [autoResponse, setAutoResponse] = useState({
    enabled: true,
    message: "Thank you for contacting us. We are currently outside of business hours. We will respond to your inquiry during our next business day."
  });

  const handleDayToggle = (dayIndex: number) => {
    const updated = [...businessDays];
    updated[dayIndex].enabled = !updated[dayIndex].enabled;
    setBusinessDays(updated);
  };

  const handleTimeChange = (dayIndex: number, field: 'openTime' | 'closeTime', value: string) => {
    const updated = [...businessDays];
    updated[dayIndex][field] = value;
    setBusinessDays(updated);
  };

  const addHoliday = () => {
    if (newHoliday.name && newHoliday.date) {
      const holiday: Holiday = {
        id: Date.now().toString(),
        name: newHoliday.name,
        date: newHoliday.date
      };
      setHolidays([...holidays, holiday]);
      setNewHoliday({ name: "", date: undefined });
      toast({
        title: "Holiday Added",
        description: `${holiday.name} has been added to the holiday list.`
      });
    }
  };

  const removeHoliday = (id: string) => {
    setHolidays(holidays.filter(h => h.id !== id));
    toast({
      title: "Holiday Removed",
      description: "Holiday has been removed from the list."
    });
  };

  const saveConfiguration = () => {
    // Here you would save to your backend/database
    toast({
      title: "Configuration Saved",
      description: "Business hours configuration has been updated successfully."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Business Hours Configuration</h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Time Zone & Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
            <CardDescription>
              Configure your business operating hours and time zone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Time Zone</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent>
                  {timeZones.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              {businessDays.map((day, index) => (
                <div key={day.day} className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={() => handleDayToggle(index)}
                    />
                    <Label className="w-20 text-sm">{day.day}</Label>
                  </div>
                  {day.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={day.openTime}
                        onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={day.closeTime}
                        onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                        className="w-24"
                      />
                    </div>
                  )}
                  {!day.enabled && (
                    <Badge variant="secondary">Closed</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Holidays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Holidays
            </CardTitle>
            <CardDescription>
              Manage company holidays and special closure dates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Holiday Name</Label>
                <Input
                  id="holiday-name"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="e.g., Christmas Day"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newHoliday.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {newHoliday.date ? format(newHoliday.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newHoliday.date}
                      onSelect={(date) => setNewHoliday({ ...newHoliday, date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
                onClick={addHoliday}
                disabled={!newHoliday.name || !newHoliday.date}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Scheduled Holidays</Label>
              {holidays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No holidays scheduled</p>
              ) : (
                <div className="space-y-2">
                  {holidays.map(holiday => (
                    <div key={holiday.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium text-sm">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(holiday.date, "PPP")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHoliday(holiday.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Response Settings */}
      <Card>
        <CardHeader>
          <CardTitle>After-Hours Auto-Response</CardTitle>
          <CardDescription>
            Configure automatic responses for tickets created outside business hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoResponse.enabled}
              onCheckedChange={(enabled) => setAutoResponse({ ...autoResponse, enabled })}
            />
            <Label>Enable auto-response for after-hours tickets</Label>
          </div>
          
          {autoResponse.enabled && (
            <div className="space-y-2">
              <Label htmlFor="auto-response-message">Auto-Response Message</Label>
              <textarea
                id="auto-response-message"
                value={autoResponse.message}
                onChange={(e) => setAutoResponse({ ...autoResponse, message: e.target.value })}
                className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                placeholder="Enter your auto-response message..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveConfiguration}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}