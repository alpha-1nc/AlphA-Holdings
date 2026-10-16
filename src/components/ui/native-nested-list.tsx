"use client";

import type React from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ListItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: ListItem[];
  metadata?: Record<string, unknown>;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export interface NativeNestedListProps {
  items: ListItem[];
  activeId?: string;
  onItemClick?: (item: ListItem) => void;
  size?: "sm" | "md" | "lg";
  showExpandIcon?: boolean;
  defaultExpanded?: boolean;
  className?: string;
  indentSize?: number;
}

const sizeVariants = {
  sm: "h-8 text-xs px-2",
  md: "h-10 text-sm px-3",
  lg: "h-12 text-base px-4",
};

const iconSizeVariants = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

interface NestedItemProps {
  item: ListItem;
  level: number;
  activeId?: string;
  onItemClick?: (item: ListItem) => void;
  size: "sm" | "md" | "lg";
  showExpandIcon: boolean;
  defaultExpanded: boolean;
  indentSize: number;
}

function NestedItem({
  item,
  level,
  activeId,
  onItemClick,
  size,
  showExpandIcon,
  defaultExpanded,
  indentSize,
}: NestedItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeId === item.id;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
    onItemClick?.(item);
    item.onClick?.(e);
  };

  const itemClassName = cn(
    buttonVariants({ variant: "ghost" }),
    sizeVariants[size],
    "w-full justify-start gap-2 relative overflow-hidden rounded-md hover:bg-accent/50",
    isActive && "font-medium bg-accent/30",
  );

  const itemContent = (
    <>
      {showExpandIcon && hasChildren && (
        <motion.div
          initial={false}
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="shrink-0"
        >
          <ChevronRight className={iconSizeVariants[size]} />
        </motion.div>
      )}
      {showExpandIcon && !hasChildren && (
        <div className={cn(iconSizeVariants[size], "shrink-0")} />
      )}
      {item.icon && (
        <motion.div
          className="shrink-0"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {item.icon}
        </motion.div>
      )}
      <span className="truncate">{item.label}</span>
    </>
  );

  return (
    <div>
      <motion.div
        initial={false}
        animate={{ x: 0 }}
        whileHover={{ x: 4 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
        }}
        style={{ paddingLeft: `${level * indentSize}px` }}
        className="relative"
      >
        <motion.div
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {item.href ? (
            <a href={item.href} className={itemClassName} onClick={handleClick}>
              {itemContent}
            </a>
          ) : (
            <Button variant="ghost" className={itemClassName} onClick={handleClick}>
              {itemContent}
            </Button>
          )}
        </motion.div>

        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
              className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-foreground"
            />
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: {
                type: "spring",
                stiffness: 300,
                damping: 25,
              },
              opacity: {
                duration: 0.2,
              },
            }}
            style={{ overflow: "hidden" }}
          >
            {item.children!.map((child) => (
              <NestedItem
                key={child.id}
                item={child}
                level={level + 1}
                activeId={activeId}
                onItemClick={onItemClick}
                size={size}
                showExpandIcon={showExpandIcon}
                defaultExpanded={defaultExpanded}
                indentSize={indentSize}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NativeNestedList({
  items,
  activeId,
  onItemClick,
  size = "md",
  showExpandIcon = true,
  defaultExpanded = false,
  className,
  indentSize = 16,
}: NativeNestedListProps) {
  return (
    <div className={cn("w-full space-y-1", className)}>
      {items.map((item) => (
        <NestedItem
          key={item.id}
          item={item}
          level={0}
          activeId={activeId}
          onItemClick={onItemClick}
          size={size}
          showExpandIcon={showExpandIcon}
          defaultExpanded={defaultExpanded}
          indentSize={indentSize}
        />
      ))}
    </div>
  );
}
