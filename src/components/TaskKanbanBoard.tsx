import { useState } from 'react';
import { TASK_STATUSES } from '../constants.js';
import type { Task, User } from '../types/api.js';
import { formatDate, isPastDate } from '../utils/project.js';
import { getAllowedTaskStatuses } from '../utils/task.js';
import { Calendar } from 'lucide-react';

import StatusBadge from './StatusBadge.js';
import TaskStatusSelect from './TaskStatusSelect.js';

export interface TaskCollectionProps {
  currentUser: User;
  tasks: Task[];
  updatingId: string | null;
  onSelectTask: (taskId: string) => void;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
}

export default function TaskKanbanBoard({
  currentUser,
  tasks,
  updatingId,
  onSelectTask,
  onStatusChange,
}: TaskCollectionProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleDragStart = (task: Task) => {
    if (getAllowedTaskStatuses(currentUser, task).length <= 1) return;
    setDraggedTask(task);
  };

  const handleDragEnd = () => setDraggedTask(null);

  const canDrop = (status: string) =>
    Boolean(
      draggedTask &&
        getAllowedTaskStatuses(currentUser, draggedTask).some((option) => option.value === status)
    );

  const handleDrop = (status: string) => {
    if (draggedTask && canDrop(status) && status !== draggedTask.status) {
      onStatusChange(draggedTask, status);
    }
    setDraggedTask(null);
  };

  return (
    <div className="kanban-board">
      {TASK_STATUSES.map((statusOption) => {
        const columnTasks = tasks.filter((task) => task.status === statusOption.value);
        return (
          <KanbanColumn
            canDrop={canDrop(statusOption.value)}
            currentUser={currentUser}
            key={statusOption.value}
            label={statusOption.label}
            onDragEnd={handleDragEnd}
            onDrop={() => handleDrop(statusOption.value)}
            onSelectTask={onSelectTask}
            onStatusChange={onStatusChange}
            status={statusOption.value}
            tasks={columnTasks}
            updatingId={updatingId}
            onDragStart={handleDragStart}
          />
        );
      })}
    </div>
  );
}

interface KanbanColumnProps {
  canDrop: boolean;
  currentUser: User;
  label: string;
  onDragEnd: () => void;
  onDragStart: (task: Task) => void;
  onDrop: () => void;
  onSelectTask: (taskId: string) => void;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
  status: string;
  tasks: Task[];
  updatingId: string | null;
}

function KanbanColumn({
  canDrop,
  currentUser,
  label,
  onDragEnd,
  onDragStart,
  onDrop,
  onSelectTask,
  onStatusChange,
  status,
  tasks,
  updatingId,
}: KanbanColumnProps) {
  const [isDragover, setIsDragover] = useState(false);

  const handleDragOver = (event: React.DragEvent) => {
    if (!canDrop) return;
    event.preventDefault();
    setIsDragover(true);
  };

  const handleDragLeave = () => setIsDragover(false);

  const handleDrop = (event: React.DragEvent) => {
    if (!canDrop) return;
    event.preventDefault();
    setIsDragover(false);
    onDrop();
  };

  return (
    <section
      aria-label={`${label} tasks`}
      className={`kanban-column${canDrop && isDragover ? ' is-dragover' : ''}`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header>
        <StatusBadge status={status} type="task" />
        <span>{tasks.length}</span>
      </header>
      <div className="kanban-cards">
        {tasks.map((task) => (
          <KanbanCard
            currentUser={currentUser}
            draggable={getAllowedTaskStatuses(currentUser, task).length > 1}
            key={task.id}
            task={task}
            updatingId={updatingId}
            onDragStart={() => onDragStart(task)}
            onDragEnd={onDragEnd}
            onSelectTask={onSelectTask}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </section>
  );
}

interface KanbanCardProps {
  currentUser: User;
  draggable: boolean;
  onDragEnd: () => void;
  onDragStart: (task: Task) => void;
  onSelectTask: (taskId: string) => void;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
  task: Task;
  updatingId: string | null;
}

function KanbanCard({
  currentUser,
  draggable,
  onDragEnd,
  onDragStart,
  onSelectTask,
  onStatusChange,
  task,
  updatingId,
}: KanbanCardProps) {
  const isOverdue = task.status !== 'done' && isPastDate(task.due_date);
  return (
    <article
      className="kanban-card"
      draggable={draggable}
      onDragEnd={onDragEnd}
      onDragStart={() => onDragStart(task)}
    >
      <button className="kanban-card-open" type="button" onClick={() => onSelectTask(task.id)}>
        <strong>{task.title}</strong>
        <span>{task.project_name || 'Project'}</span>
      </button>
      <div className="kanban-card-meta">
        <span className={`task-date ${isOverdue ? 'is-overdue' : ''}`}>
          <Calendar size={13} />
          {formatDate(task.due_date)}
        </span>
        {task.milestone_title && <span className="kanban-milestone">{task.milestone_title}</span>}
      </div>
      <TaskStatusSelect
        task={task}
        statuses={getAllowedTaskStatuses(currentUser, task)}
        isUpdating={updatingId === task.id}
        onStatusChange={onStatusChange}
      />
    </article>
  );
}
