<?php

namespace App\Firebase;

use App\Events\Auth\AuthenticatedEvent;
use RuntimeException;
use Illuminate\Support\Str;
use Illuminate\Auth\Recaller;
use Illuminate\Contracts\Auth\Guard;
use App\Traits\Users\CreatesTokenForUser;
use Illuminate\Contracts\Session\Session;
use Illuminate\Contracts\Auth\UserProvider;
use Symfony\Component\HttpFoundation\Request;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Cookie\QueueingFactory as CookieJar;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;

class FirebaseGuard implements Guard
{
    use CreatesTokenForUser;

    protected $name;
    protected $user;
    protected $provider;
    protected $session;
    protected $request;
    protected $events;

    protected $loggedOut = false;

    public function __construct(Session $session, UserProvider $provider, $cookie)
    {
        $this->name = 'app-web';
        $this->provider = $provider;
        $this->session = $session;
        $this->cookie = $cookie;
    }

    public function check()
    {
        return !is_null($this->user());
    }

    public function guest()
    {
        return !$this->check();
    }

    public function user()
    {
        if ($this->loggedOut) {
            return;
        }

        if (! is_null($this->user)) {
            return $this->user;
        }

        $id = $this->session->get($this->getName());

        if (! is_null($id) && $this->user = $this->provider->retrieveById($id)) {
            $this->fireAuthenticatedEvent($this->user);
        }

        if (is_null($this->user) && ! is_null($recaller = $this->recaller())) {
            $this->user = $this->userFromRecaller($recaller);

            if ($this->user) {
                $this->updateSession($this->user->getAuthIdentifier());

                $this->fireLoginEvent($this->user, true);
            }
        }

        return $this->user;
    }

    public function id()
    {
        if ($this->loggedOut) {
            return;
        }

        return $this->user()
            ? $this->user()->getAuthIdentifier()
            : $this->session->get($this->getName());
    }

    public function login(Authenticatable $user, $remember = false)
    {
        $this->updateSession($user->getAuthIdentifier());

        $this->createToken($user);

        if ($remember) {
            $this->ensureRememberTokenIsSet($user);
            $this->queueRecallerCookie($user);
        }

        AuthenticatedEvent::dispatch($user);

        $this->setUser($user);

        return $user;
    }

    public function validate(array $credentials = [])
    {
        $this->lastAttempted = $user = $this->provider->retrieveByCredentials($credentials);
        return $this->hasValidCredentials($user, $credentials);
    }

    public function setUser(Authenticatable $user)
    {
        $this->user = $user;
        $this->loggedOut = false;
        return $this;
    }

    public function getName()
    {
        return 'login_'.$this->name.'_'.sha1(static::class);
    }

    public function getRequest()
    {
        return $this->request ?: Request::createFromGlobals();
    }

    public function getCookieJar()
    {
        if (! isset($this->cookie)) {
            throw new RuntimeException('Cookie jar has not been set.');
        }

        return $this->cookie;
    }

    public function getRecallerName()
    {
        return 'remember_'.$this->name.'_'.sha1(static::class);
    }

    public function setRequest(Request $request)
    {
        $this->request = $request;

        return $this;
    }

    public function setCookieJar(CookieJar $cookie)
    {
        $this->cookie = $cookie;
    }

    protected function createRecaller($value)
    {
        return $this->getCookieJar()->forever($this->getRecallerName(), $value);
    }

    protected function cycleRememberToken(AuthenticatableContract $user)
    {
        $user->setRememberToken($token = Str::random(60));

        $this->provider->updateRememberToken($user, $token);
    }

    protected function ensureRememberTokenIsSet(AuthenticatableContract $user)
    {
        if (empty($user->getRememberToken())) {
            $this->cycleRememberToken($user);
        }
    }

    protected function fireAuthenticatedEvent($user)
    {
        if (isset($this->events)) {
            $this->events->dispatch(new \Illuminate\Auth\Events\Authenticated(
                $this->name, $user
            ));
        }
    }

    protected function hasValidCredentials($user, $credentials)
    {
        return ! is_null($user) && $this->provider->validateCredentials($user, $credentials);
    }

    protected function queueRecallerCookie(AuthenticatableContract $user)
    {
        $this->getCookieJar()->queue($this->createRecaller(
            $user->getAuthIdentifier().'|'.$user->getRememberToken().'|'.$user->getAuthPassword()
        ));
    }

    protected function recaller()
    {
        if (is_null($this->request)) {
            return;
        }

        if ($recaller = $this->request->cookies->get($this->getRecallerName())) {
            return new Recaller($recaller);
        }
    }

    protected function updateSession($id)
    {
        $this->session->put($this->getName(), $id);
        $this->session->migrate(true);
    }

    protected function userFromRecaller($recaller)
    {
        if (! $recaller->valid() || $this->recallAttempted) {
            return;
        }

        $this->recallAttempted = true;

        $this->viaRemember = ! is_null($user = $this->provider->retrieveByToken(
            $recaller->id(), $recaller->token()
        ));

        return $user;
    }

}
