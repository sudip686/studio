'use client';

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorDisplay } from "./error-display";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorDisplay message={this.state.error?.message || "Something went wrong"} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
