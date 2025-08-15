import { useState, useCallback } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Save, Settings2 } from 'lucide-react';

// Initial workflow nodes and edges
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Ticket Created' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    type: 'default',
    data: { label: 'Check Priority' },
    position: { x: 250, y: 125 },
  },
  {
    id: '3',
    type: 'default',
    data: { label: 'High Priority\nAssign to Senior Agent' },
    position: { x: 100, y: 250 },
  },
  {
    id: '4',
    type: 'default',
    data: { label: 'Normal Priority\nAssign to Available Agent' },
    position: { x: 400, y: 250 },
  },
  {
    id: '5',
    type: 'output',
    data: { label: 'Send Email Notification' },
    position: { x: 250, y: 375 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', label: 'Trigger' },
  { id: 'e2-3', source: '2', target: '3', label: 'High Priority' },
  { id: 'e2-4', source: '2', target: '4', label: 'Normal Priority' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-5', source: '4', target: '5' },
];

const workflowTemplates = [
  {
    id: 'ticket-routing',
    name: 'Ticket Routing',
    description: 'Automatically route tickets based on category and priority',
    status: 'Active',
  },
  {
    id: 'escalation',
    name: 'Escalation Workflow',
    description: 'Escalate unresolved tickets after specified time',
    status: 'Draft',
  },
  {
    id: 'approval',
    name: 'Approval Workflow',
    description: 'Require manager approval for certain ticket types',
    status: 'Inactive',
  },
];

export function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>('ticket-routing');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleSaveWorkflow = () => {
    console.log('Saving workflow...', { nodes, edges });
    // Here you would save the workflow to your backend
  };

  const handleRunWorkflow = () => {
    console.log('Running workflow...', selectedWorkflow);
    // Here you would execute the workflow
  };

  const addNewNode = () => {
    const newNode: Node = {
      id: (nodes.length + 1).toString(),
      type: 'default',
      data: { label: 'New Step' },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Workflow Builder</h2>
          <p className="text-muted-foreground">Create and manage automated ticket workflows</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addNewNode} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
          <Button onClick={handleSaveWorkflow} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={handleRunWorkflow}>
            <Play className="h-4 w-4 mr-2" />
            Run Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Workflow Templates */}
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Workflow Templates
              </CardTitle>
              <CardDescription>
                Choose a workflow template to start with
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflowTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedWorkflow === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedWorkflow(template.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge 
                      variant={template.status === 'Active' ? 'default' : template.status === 'Draft' ? 'secondary' : 'outline'}
                    >
                      {template.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Workflow Properties */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Trigger Event</label>
                <p className="text-sm text-muted-foreground">Ticket Created</p>
              </div>
              <div>
                <label className="text-sm font-medium">Conditions</label>
                <p className="text-sm text-muted-foreground">Priority is High OR Medium</p>
              </div>
              <div>
                <label className="text-sm font-medium">Actions</label>
                <p className="text-sm text-muted-foreground">Auto-assign, Send notification</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Canvas */}
        <div className="col-span-8">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>Visual Workflow Editor</CardTitle>
              <CardDescription>
                Drag and connect nodes to build your workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[520px] p-0">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                style={{ backgroundColor: "#F7F9FB" }}
              >
                <MiniMap zoomable pannable />
                <Controls />
                <Background />
              </ReactFlow>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}