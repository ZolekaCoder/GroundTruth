import { Component, type ReactNode } from "react";

/** If anything in the room fails to render, fall back to a paper note instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode; onTextView?: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-[#17120d] p-6">
        <div className="mat-paper max-w-md p-8" role="alert">
          <p className="typed text-[11px] text-[#6b5a3c]">THE NEWSROOM HIT A PROBLEM</p>
          <p className="mt-3 text-[15px]">Part of the room failed to draw this case. The case itself is safe on the server.</p>
          <p className="typed mt-3 text-[12px] text-[#6b5a3c]">{this.state.error.message}</p>
          <div className="mt-5 flex gap-4 text-[14px]">
            {this.props.onTextView && <button className="underline" onClick={this.props.onTextView}>Open the text view</button>}
            <button className="underline" onClick={() => location.assign("/")}>Back to the room</button>
          </div>
        </div>
      </div>
    );
  }
}
